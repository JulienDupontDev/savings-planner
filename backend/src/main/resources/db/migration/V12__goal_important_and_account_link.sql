alter table finance.goals add column important boolean not null default false;
alter table finance.goals add column account_id uuid references finance.accounts(id) on delete set null;
