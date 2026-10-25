package pl.jakubmikolajczyk.savings.goalintegration

import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import pl.jakubmikolajczyk.savings.dto.FreeCashCycleDto
import java.math.BigDecimal
import java.sql.ResultSet
import java.util.UUID

@Repository
class GoalIntegrationRepository(private val jdbc: NamedParameterJdbcTemplate) {
    private val cycleMapper = RowMapper { rs: ResultSet, _: Int ->
        FreeCashCycleDto(
            periodNo = rs.getInt("period_no"),
            accountId = rs.getObject("account_id", UUID::class.java),
            accountName = rs.getString("account_name"),
            periodStart = rs.getDate("period_start").toLocalDate().toString(),
            periodEnd = rs.getDate("period_end")?.toLocalDate()?.toString(),
            isPartial = rs.getBoolean("is_partial"),
            income = rs.getBigDecimal("income"),
            fixedExpense = rs.getBigDecimal("fixed_expense"),
            recurringExpense = rs.getBigDecimal("recurring_expense"),
            committedExpense = rs.getBigDecimal("committed_expense"),
            variableExpense = rs.getBigDecimal("variable_expense"),
            uncategorizedExpense = rs.getBigDecimal("uncategorized_expense"),
            totalExpense = rs.getBigDecimal("total_expense"),
            savingsContribution = rs.getBigDecimal("savings_contribution"),
            savingsWithdrawal = rs.getBigDecimal("savings_withdrawal"),
            net = rs.getBigDecimal("net"),
            freeCash = rs.getBigDecimal("free_cash"),
        )
    }

    fun listFreeCashCycles(accountId: UUID?, limit: Int): List<FreeCashCycleDto> {
        val where = if (accountId == null) "" else "where account_id = :accountId"
        return jdbc.query(
            """
                select
                    period_no,
                    account_id,
                    account_name,
                    period_start,
                    period_end,
                    is_partial,
                    income,
                    fixed_expense,
                    recurring_expense,
                    committed_expense,
                    variable_expense,
                    uncategorized_expense,
                    total_expense,
                    savings_contribution,
                    savings_withdrawal,
                    net,
                    free_cash
                from finance.free_cash_per_cycle
                $where
                order by period_start desc, account_id
                limit :limit
            """.trimIndent(),
            MapSqlParameterSource()
                .addValue("accountId", accountId)
                .addValue("limit", limit.coerceIn(1, 500)),
            cycleMapper,
        )
    }

    fun listGoalInputs(): List<GoalPaceInput> {
        val goals = jdbc.query(
            """
                select id, name, target_amount, coalesce(current_saved, 0) as current_saved, priority, fixed_allocation
                from finance.goals
                order by priority, name
            """.trimIndent(),
        ) { rs, _ ->
            GoalPaceInput(
                goalId = rs.getObject("id", UUID::class.java),
                name = rs.getString("name"),
                targetAmount = rs.getBigDecimal("target_amount"),
                currentSaved = rs.getBigDecimal("current_saved"),
                priority = rs.getInt("priority"),
                fixedAllocation = rs.getBigDecimal("fixed_allocation"),
            )
        }

        val links = jdbc.query(
            "select goal_id, account_id from finance.goal_accounts order by account_id",
            emptyMap<String, Any>(),
        ) { rs, _ -> rs.getObject("goal_id", UUID::class.java) to rs.getObject("account_id", UUID::class.java) }
            .groupBy({ it.first }, { it.second })
        if (links.isEmpty()) return goals

        val balances = jdbc.query(
            """
                select distinct on (account_id) account_id, balance
                from finance.account_snapshots
                order by account_id, snapshot_date desc
            """.trimIndent(),
            emptyMap<String, Any>(),
        ) { rs, _ -> rs.getObject("account_id", UUID::class.java) to rs.getBigDecimal("balance").max(BigDecimal.ZERO) }
            .toMap()
            .toMutableMap()

        // Linked goals draw on their accounts' latest balances by priority, so a shared account is never counted twice.
        return goals.map { goal ->
            val accountIds = links[goal.goalId] ?: return@map goal
            var saved = BigDecimal.ZERO
            for (accountId in accountIds) {
                val available = balances[accountId] ?: BigDecimal.ZERO
                val take = available.min((goal.targetAmount - saved).max(BigDecimal.ZERO))
                balances[accountId] = available - take
                saved += take
            }
            goal.copy(currentSaved = saved)
        }
    }
}
