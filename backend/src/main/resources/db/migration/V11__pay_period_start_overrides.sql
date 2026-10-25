-- Manual override of a cycle start date. Keyed by the anchor transaction so it
-- survives the full recalculation of finance.pay_periods.
create table finance.pay_period_start_overrides (
    anchor_tx_id bigint primary key references finance.transactions(id) on delete cascade,
    start_date   date not null,
    created_at   timestamptz not null default now()
);
