-- Reference catalogs only. No real accounts, fabricated social activity, or personal data.
insert into public.academic_programs(id,code,country_code,education_system,level_code,labels)
values ('10000000-0000-4000-8000-000000000001','gr-panhellenic','GR','general-secondary','upper-secondary',
'{"en":"Panhellenic exams","el":"Πανελλαδικές εξετάσεις"}') on conflict(code) do nothing;
insert into public.subjects(id,code,labels) values
('10000000-0000-4000-8000-000000000011','mathematics','{"en":"Mathematics","el":"Μαθηματικά"}'),
('10000000-0000-4000-8000-000000000012','physics','{"en":"Physics","el":"Φυσική"}'),
('10000000-0000-4000-8000-000000000013','chemistry','{"en":"Chemistry","el":"Χημεία"}'),
('10000000-0000-4000-8000-000000000014','modern-greek','{"en":"Modern Greek","el":"Νεοελληνική Γλώσσα"}')
on conflict(code) do nothing;
insert into public.program_subjects(program_id,subject_id)
select p.id,s.id from public.academic_programs p cross join public.subjects s
where p.code='gr-panhellenic' and s.code in ('mathematics','physics','chemistry','modern-greek')
on conflict do nothing;
