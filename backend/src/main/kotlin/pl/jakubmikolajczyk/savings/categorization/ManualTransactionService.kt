package pl.jakubmikolajczyk.savings.categorization

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import pl.jakubmikolajczyk.savings.domain.BadRequestException
import pl.jakubmikolajczyk.savings.domain.NotFoundException
import pl.jakubmikolajczyk.savings.dto.ManualTransactionCreateDto
import pl.jakubmikolajczyk.savings.dto.TransactionDto
import pl.jakubmikolajczyk.savings.ingest.CanonicalTx
import pl.jakubmikolajczyk.savings.ingest.TransactionInsert
import pl.jakubmikolajczyk.savings.ingest.TransactionUpsertRepository
import pl.jakubmikolajczyk.savings.payperiod.PayPeriodService
import pl.jakubmikolajczyk.savings.repository.AccountRepository
import java.math.BigDecimal
import java.time.LocalDate
import java.time.format.DateTimeParseException
import java.util.UUID

@Service
class ManualTransactionService(
    private val accounts: AccountRepository,
    private val transactions: TransactionUpsertRepository,
    private val categorizationRepository: CategorizationRepository,
    private val categorization: CategorizationService,
    private val payPeriods: PayPeriodService,
) {
    @Transactional
    fun create(dto: ManualTransactionCreateDto): TransactionDto {
        val account = accounts.findById(dto.accountId)
            .orElseThrow { NotFoundException("Account ${dto.accountId} not found") }
        if (dto.amount.compareTo(BigDecimal.ZERO) == 0) {
            throw BadRequestException("Transaction amount cannot be zero")
        }
        if (dto.categoryId != null && categorizationRepository.findCategory(dto.categoryId) == null) {
            throw NotFoundException("Category ${dto.categoryId} not found")
        }
        val bookedAt = try {
            LocalDate.parse(dto.bookedAt)
        } catch (_: DateTimeParseException) {
            throw BadRequestException("Transaction date must use YYYY-MM-DD")
        }
        val description = dto.description.trim()
        if (description.isBlank()) throw BadRequestException("Transaction description cannot be blank")
        val counterparty = dto.counterparty?.trim()?.takeIf(String::isNotBlank)
        val transaction = CanonicalTx(
            bookedAt = bookedAt,
            amount = dto.amount,
            currency = account.currency,
            description = description,
            counterparty = counterparty,
            raw = mapOf("manual" to true),
        )
        val id = transactions.insertReturningIdIgnoreDuplicate(
            TransactionInsert(
                accountId = account.id,
                source = "manual",
                fingerprint = UUID.randomUUID().toString(),
                tx = transaction,
            ),
        ) ?: error("Manually entered transaction was not inserted")

        categorization.categorizeInsertedTransaction(id, description, counterparty, dto.amount, account.currency)
        dto.categoryId?.let { categorizationRepository.overrideTransactionCategory(id, it, true) }
        payPeriods.refreshPayPeriods()
        return categorizationRepository.findTransaction(id)
            ?: error("Created transaction $id could not be loaded")
    }
}
