update plans set price_paise = 349900 where name = 'Starter';

update plans
set price_paise = 549900,
    features = '["Fees","Receipts"]'::jsonb
where name = 'Growth';

update plans
set price_paise = 999900,
    features = '["Parent portal","Reports","Unlimited children"]'::jsonb
where name = 'Campus';
