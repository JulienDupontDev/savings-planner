package pl.jakubmikolajczyk.savings.ingest

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import pl.jakubmikolajczyk.savings.entity.AccountEntity
import pl.jakubmikolajczyk.savings.repository.AccountRepository

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class IngestControllerIntegrationTest @Autowired constructor(
    private val mockMvc: MockMvc,
    private val accounts: AccountRepository,
) {
    @Test
    fun `Alior CSV ingest is idempotent through HTTP API`() {
        val account = accounts.save(AccountEntity(name = "Alior", bucket = "accounts"))

        performAliorImport(account.id.toString())
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.inserted").value(3))
            .andExpect(jsonPath("$.skipped").value(0))
            .andExpect(jsonPath("$.bank").value("ALIOR_CSV"))
            .andExpect(jsonPath("$.accountId").value(account.id.toString()))

        performAliorImport(account.id.toString())
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.inserted").value(0))
            .andExpect(jsonPath("$.skipped").value(3))
    }

    @Test
    fun `manually entered salary is saved and offered as a pay period anchor`() {
        val account = accounts.save(AccountEntity(name = "Everyday", bucket = "accounts", currency = "EUR"))

        mockMvc.perform(
            post("/api/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {
                          "accountId": "${account.id}",
                          "bookedAt": "2026-10-25",
                          "amount": 3200.00,
                          "description": "Monthly salary",
                          "counterparty": "Example employer"
                        }
                    """.trimIndent(),
                )
                .header("X-Api-Token", "test-token"),
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.source").value("manual"))
            .andExpect(jsonPath("$.currency").value("EUR"))
            .andExpect(jsonPath("$.amount").value(3200.0))

        mockMvc.perform(
            get("/api/income-anchors/candidates")
                .header("X-Api-Token", "test-token"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].counterparty").value("example employer"))
            .andExpect(jsonPath("$[0].transactionCount").value(1))
    }

    private fun performAliorImport(accountId: String) =
        mockMvc.perform(
            multipart("/api/ingest")
                .file(aliorFile())
                .param("bank", "ALIOR_CSV")
                .param("accountId", accountId)
                .header("X-Api-Token", "test-token"),
        )

    private fun aliorFile(): MockMultipartFile {
        val bytes = javaClass.getResourceAsStream("/fixtures/alior_sample.csv")?.readBytes()
            ?: error("Missing Alior fixture")
        return MockMultipartFile("file", "alior_sample.csv", MediaType.TEXT_PLAIN_VALUE, bytes)
    }

    companion object {
        @Container
        val postgres = PostgreSQLContainer("postgres:17")

        @JvmStatic
        @DynamicPropertySource
        fun datasourceProperties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl)
            registry.add("spring.datasource.username", postgres::getUsername)
            registry.add("spring.datasource.password", postgres::getPassword)
            registry.add("app.seed.enabled") { "false" }
        }
    }
}
