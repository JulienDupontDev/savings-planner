package pl.jakubmikolajczyk.savings.goalintegration

import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import pl.jakubmikolajczyk.savings.dto.FreeCashCycleDto
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

    fun listGoalInputs(): List<GoalPaceInput> =
        jdbc.query(
            """
                with latest as (
                    select distinct on (account_id) account_id, balance
                    from finance.account_snapshots
                    order by account_id, snapshot_date desc
                ),
                linked as (
                    select g.id,
                        greatest(0, coalesce(l.balance, 0)) as balance,
                        coalesce(sum(g.target_amount) over (
                            partition by g.account_id
                            order by g.priority, g.name
                            rows between unbounded preceding and 1 preceding
                        ), 0) as higher_priority_targets
                    from finance.goals g
                    left join latest l on l.account_id = g.account_id
                    where g.account_id is not null
                )
                select g.id, g.name, g.target_amount,
                    case when g.account_id is null then coalesce(g.current_saved, 0)
                         else least(g.target_amount, greatest(0, k.balance - k.higher_priority_targets))
                    end as current_saved,
                    g.priority, g.fixed_allocation
                from finance.goals g
                left join linked k on k.id = g.id
                order by g.priority, g.name
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
}
