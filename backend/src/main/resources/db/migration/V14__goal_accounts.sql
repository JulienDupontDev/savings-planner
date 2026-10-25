create table finance.goal_accounts (
    goal_id uuid not null references finance.goals(id) on delete cascade,
    account_id uuid not null references finance.accounts(id) on delete cascade,
    primary key (goal_id, account_id)
);

insert into finance.goal_accounts (goal_id, account_id)
select id, account_id from finance.goals where account_id is not null;

alter table finance.goals drop column account_id;
