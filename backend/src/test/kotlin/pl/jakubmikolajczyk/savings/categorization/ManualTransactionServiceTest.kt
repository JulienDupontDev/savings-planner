package pl.jakubmikolajczyk.savings.categorization

import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import pl.jakubmikolajczyk.savings.dto.ManualTransactionCreateDto
import pl.jakubmikolajczyk.savings.dto.TransactionDto
import pl.jakubmikolajczyk.savings.entity.AccountEntity
import pl.jakubmikolajczyk.savings.ingest.TransactionInsert
import pl.jakubmikolajczyk.savings.ingest.TransactionUpsertRepository
import pl.jakubmikolajczyk.savings.payperiod.PayPeriodService
import pl.jakubmikolajczyk.savings.repository.AccountRepository
import java.math.BigDecimal
import java.util.Optional

class ManualTransactionServiceTest {
    @Test
    fun `manual salary uses account currency and refreshes salary cycles`() {
        val account = AccountEntity(name = "Daily account", bucket = "accounts", currency = "EUR")
        val accounts = mockk<AccountRepository>()
        every { accounts.findById(account.id) } returns Optional.of(account)

        val insertSlot = slot<TransactionInsert>()
        val transactions = mockk<TransactionUpsertRepository>()
        every { transactions.insertReturningIdIgnoreDuplicate(capture(insertSlot)) } returns 45L

        val result = TransactionDto(
            id = 45L,
            accountId = account.id,
            bookedAt = "2026-10-25",
            amount = BigDecimal("3200.00"),
            currency = "EUR",
            description = "Monthly salary",
            counterparty = "Example employer",
            source = "manual",
        )
        val categorizationRepository = mockk<CategorizationRepository>()
        every { categorizationRepository.findTransaction(45L) } returns result
        val categorization = mockk<CategorizationService>(relaxed = true)
        val payPeriods = mockk<PayPeriodService>(relaxed = true)
        val service = ManualTransactionService(
            accounts,
            transactions,
            categorizationRepository,
            categorization,
            payPeriods,
        )

        val created = service.create(
            ManualTransactionCreateDto(
                accountId = account.id,
                bookedAt = "2026-10-25",
                amount = BigDecimal("3200.00"),
                description = " Monthly salary ",
                counterparty = " Example employer ",
            ),
        )

        assertEquals(result, created)
        assertEquals("manual", insertSlot.captured.source)
        assertEquals("EUR", insertSlot.captured.tx.currency)
        assertEquals(BigDecimal("3200.00"), insertSlot.captured.tx.amount)
        assertEquals("Monthly salary", insertSlot.captured.tx.description)
        assertEquals("Example employer", insertSlot.captured.tx.counterparty)
        verify { categorization.categorizeInsertedTransaction(45L, "Monthly salary", "Example employer", BigDecimal("3200.00"), "EUR") }
        verify { payPeriods.refreshPayPeriods() }
    }
}
