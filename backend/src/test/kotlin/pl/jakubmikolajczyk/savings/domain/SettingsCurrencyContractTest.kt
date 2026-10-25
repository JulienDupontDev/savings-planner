package pl.jakubmikolajczyk.savings.domain

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import pl.jakubmikolajczyk.savings.dto.AccountBucket
import pl.jakubmikolajczyk.savings.dto.SettingsDto
import java.math.BigDecimal

class SettingsCurrencyContractTest {
    private val objectMapper = jacksonObjectMapper()

    @Test
    fun `default currency is stored and restored in settings payload`() {
        val settings = SettingsDto(
            monthlyIncome = BigDecimal("10000"),
            monthlyExpenses = BigDecimal("6000"),
            startMonth = "2026-10",
            horizonMonths = 36,
            defaultCurrency = "EUR",
            emergencyFundBuckets = listOf(AccountBucket.safety_cushion),
        )

        val payload = objectMapper.writeValueAsString(settings)
        val restored = objectMapper.readValue<SettingsDto>(payload)

        assertEquals("EUR", restored.defaultCurrency)
    }

    @Test
    fun `legacy settings payload defaults currency to PLN`() {
        val payload = """
            {
              "monthlyIncome": 10000,
              "monthlyExpenses": 6000,
              "startMonth": "2026-10",
              "horizonMonths": 36,
              "emergencyFundBuckets": ["safety_cushion"]
            }
        """.trimIndent()

        val restored = objectMapper.readValue<SettingsDto>(payload)

        assertEquals("PLN", restored.defaultCurrency)
    }
}
