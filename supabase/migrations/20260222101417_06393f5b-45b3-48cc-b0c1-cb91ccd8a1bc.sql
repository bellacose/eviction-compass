
-- ========== SEED DATA ==========

-- 1. Clients
INSERT INTO public.clients (id, company_name, contact_name, email, phone, address_line1, city, state, zip) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Erie Property Group LLC', 'Michael Torres', 'mtorres@eriepropertygroup.com', '716-555-0101', '120 Delaware Ave, Suite 300', 'Buffalo', 'NY', '14202'),
  ('a1b2c3d4-0001-4000-8000-000000000002', 'Lakeside Realty Management', 'Sarah Chen', 'schen@lakesiderealty.com', '716-555-0202', '45 Elmwood Ave', 'Buffalo', 'NY', '14201');

-- 2. Properties
INSERT INTO public.properties (id, client_id, address_line1, city, state, zip, county) VALUES
  ('b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', '456 Main St, Apt 2B', 'Buffalo', 'NY', '14203', 'Erie'),
  ('b1b2c3d4-0001-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', '789 Hertel Ave, Unit 1', 'Buffalo', 'NY', '14207', 'Erie'),
  ('b1b2c3d4-0001-4000-8000-000000000003', 'a1b2c3d4-0001-4000-8000-000000000002', '123 Elmwood Ave, Apt 4A', 'Buffalo', 'NY', '14201', 'Erie'),
  ('b1b2c3d4-0001-4000-8000-000000000004', 'a1b2c3d4-0001-4000-8000-000000000002', '55 Grant St, Unit 3', 'Buffalo', 'NY', '14213', 'Erie'),
  ('b1b2c3d4-0001-4000-8000-000000000005', 'a1b2c3d4-0001-4000-8000-000000000001', '200 Delaware Ave, Apt 5C', 'Buffalo', 'NY', '14202', 'Erie'),
  ('b1b2c3d4-0001-4000-8000-000000000006', 'a1b2c3d4-0001-4000-8000-000000000002', '88 Allen St, Unit 2', 'Buffalo', 'NY', '14201', 'Erie');

-- 3. Tenants
INSERT INTO public.tenants (id, full_name, phone, email, mailing_address) VALUES
  ('c1b2c3d4-0001-4000-8000-000000000001', 'James Wilson', '716-555-1001', 'jwilson@email.com', '456 Main St, Apt 2B, Buffalo NY 14203'),
  ('c1b2c3d4-0001-4000-8000-000000000002', 'Maria Garcia', '716-555-1002', 'mgarcia@email.com', '789 Hertel Ave, Unit 1, Buffalo NY 14207'),
  ('c1b2c3d4-0001-4000-8000-000000000003', 'Robert Johnson', '716-555-1003', 'rjohnson@email.com', '123 Elmwood Ave, Apt 4A, Buffalo NY 14201'),
  ('c1b2c3d4-0001-4000-8000-000000000004', 'Lisa Anderson', '716-555-1004', 'landerson@email.com', '55 Grant St, Unit 3, Buffalo NY 14213'),
  ('c1b2c3d4-0001-4000-8000-000000000005', 'David Brown', '716-555-1005', 'dbrown@email.com', '200 Delaware Ave, Apt 5C, Buffalo NY 14202'),
  ('c1b2c3d4-0001-4000-8000-000000000006', 'Jennifer Lee', '716-555-1006', 'jlee@email.com', '88 Allen St, Unit 2, Buffalo NY 14201');

-- 4. Cases (6 cases across various statuses)
INSERT INTO public.cases (id, case_number, client_id, property_id, primary_tenant_id, status, priority, opened_date, court_name) VALUES
  ('d1b2c3d4-0001-4000-8000-000000000001', 'EV-2026-0001', 'a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0001-4000-8000-000000000001', 'c1b2c3d4-0001-4000-8000-000000000001', 'intake', 'high', '2026-02-15', NULL),
  ('d1b2c3d4-0001-4000-8000-000000000002', 'EV-2026-0002', 'a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0001-4000-8000-000000000002', 'c1b2c3d4-0001-4000-8000-000000000002', 'notice_served', 'normal', '2026-02-01', NULL),
  ('d1b2c3d4-0001-4000-8000-000000000003', 'EV-2026-0003', 'a1b2c3d4-0001-4000-8000-000000000002', 'b1b2c3d4-0001-4000-8000-000000000003', 'c1b2c3d4-0001-4000-8000-000000000003', 'filed', 'normal', '2026-01-15', NULL),
  ('d1b2c3d4-0001-4000-8000-000000000004', 'EV-2026-0004', 'a1b2c3d4-0001-4000-8000-000000000002', 'b1b2c3d4-0001-4000-8000-000000000004', 'c1b2c3d4-0001-4000-8000-000000000004', 'court_scheduled', 'high', '2026-01-10', 'Buffalo City Court Housing Part'),
  ('d1b2c3d4-0001-4000-8000-000000000005', 'EV-2026-0005', 'a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0001-4000-8000-000000000005', 'c1b2c3d4-0001-4000-8000-000000000005', 'resolved', 'low', '2025-12-01', 'Buffalo City Court Housing Part'),
  ('d1b2c3d4-0001-4000-8000-000000000006', 'EV-2026-0006', 'a1b2c3d4-0001-4000-8000-000000000002', 'b1b2c3d4-0001-4000-8000-000000000006', 'c1b2c3d4-0001-4000-8000-000000000006', 'ready_to_file', 'normal', '2026-01-20', NULL);

-- Update sequence to avoid conflicts
SELECT setval('public.case_number_seq', 7);

-- 5. Case tenants
INSERT INTO public.case_tenants (case_id, tenant_id, is_primary) VALUES
  ('d1b2c3d4-0001-4000-8000-000000000001', 'c1b2c3d4-0001-4000-8000-000000000001', true),
  ('d1b2c3d4-0001-4000-8000-000000000002', 'c1b2c3d4-0001-4000-8000-000000000002', true),
  ('d1b2c3d4-0001-4000-8000-000000000003', 'c1b2c3d4-0001-4000-8000-000000000003', true),
  ('d1b2c3d4-0001-4000-8000-000000000004', 'c1b2c3d4-0001-4000-8000-000000000004', true),
  ('d1b2c3d4-0001-4000-8000-000000000005', 'c1b2c3d4-0001-4000-8000-000000000005', true),
  ('d1b2c3d4-0001-4000-8000-000000000006', 'c1b2c3d4-0001-4000-8000-000000000006', true);

-- 6. Default Milestone Template
INSERT INTO public.milestone_templates (id, template_name, jurisdiction_state, jurisdiction_county, case_type, is_default) VALUES
  ('e1b2c3d4-0001-4000-8000-000000000001', 'Erie County Nonpayment Default', 'NY', 'Erie', 'nonpayment', true);

INSERT INTO public.milestone_template_items (template_id, milestone_key, label, order_index, auto_offset_days, default_client_visible) VALUES
  ('e1b2c3d4-0001-4000-8000-000000000001', 'case_opened', 'Case Opened', 1, 0, true),
  ('e1b2c3d4-0001-4000-8000-000000000001', '5_day_internal', '5-Day Internal Milestone', 2, 5, false),
  ('e1b2c3d4-0001-4000-8000-000000000001', '14_day_demand_prepared', '14-Day Rent Demand Prepared', 3, 5, true),
  ('e1b2c3d4-0001-4000-8000-000000000001', '14_day_demand_served', '14-Day Rent Demand Served', 4, 2, true),
  ('e1b2c3d4-0001-4000-8000-000000000001', 'proof_of_service', 'Proof of Service Uploaded', 5, 1, true),
  ('e1b2c3d4-0001-4000-8000-000000000001', 'waiting_period_complete', 'Waiting Period Complete / Ready to File', 6, 14, true),
  ('e1b2c3d4-0001-4000-8000-000000000001', 'petition_filed', 'Petition Filed', 7, 3, true),
  ('e1b2c3d4-0001-4000-8000-000000000001', 'court_date_scheduled', 'Court Date Scheduled', 8, 7, true),
  ('e1b2c3d4-0001-4000-8000-000000000001', 'court_appearance', 'Court Appearance', 9, NULL, true),
  ('e1b2c3d4-0001-4000-8000-000000000001', 'court_outcome', 'Court Outcome Logged', 10, 0, true),
  ('e1b2c3d4-0001-4000-8000-000000000001', 'case_resolved', 'Case Resolved', 11, NULL, true),
  ('e1b2c3d4-0001-4000-8000-000000000001', 'case_closed', 'Case Closed', 12, NULL, true);

-- 7. Case milestones for all 6 cases

-- Case 1 (intake): only first milestone done
INSERT INTO public.case_milestones (case_id, milestone_key, label, order_index, due_date, status, client_visible, completed_at) VALUES
  ('d1b2c3d4-0001-4000-8000-000000000001', 'case_opened', 'Case Opened', 1, '2026-02-15', 'complete', true, '2026-02-15T10:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000001', '5_day_internal', '5-Day Internal Milestone', 2, '2026-02-20', 'overdue', false, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000001', '14_day_demand_prepared', '14-Day Rent Demand Prepared', 3, '2026-02-25', 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000001', '14_day_demand_served', '14-Day Rent Demand Served', 4, '2026-02-27', 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000001', 'proof_of_service', 'Proof of Service Uploaded', 5, '2026-02-28', 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000001', 'waiting_period_complete', 'Waiting Period Complete / Ready to File', 6, '2026-03-14', 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000001', 'petition_filed', 'Petition Filed', 7, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000001', 'court_date_scheduled', 'Court Date Scheduled', 8, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000001', 'court_appearance', 'Court Appearance', 9, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000001', 'court_outcome', 'Court Outcome Logged', 10, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000001', 'case_resolved', 'Case Resolved', 11, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000001', 'case_closed', 'Case Closed', 12, NULL, 'pending', true, NULL);

-- Case 2 (notice_served): milestones 1-4 done
INSERT INTO public.case_milestones (case_id, milestone_key, label, order_index, due_date, status, client_visible, completed_at) VALUES
  ('d1b2c3d4-0001-4000-8000-000000000002', 'case_opened', 'Case Opened', 1, '2026-02-01', 'complete', true, '2026-02-01T09:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000002', '5_day_internal', '5-Day Internal Milestone', 2, '2026-02-06', 'complete', false, '2026-02-05T14:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000002', '14_day_demand_prepared', '14-Day Rent Demand Prepared', 3, '2026-02-11', 'complete', true, '2026-02-10T11:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000002', '14_day_demand_served', '14-Day Rent Demand Served', 4, '2026-02-13', 'complete', true, '2026-02-12T16:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000002', 'proof_of_service', 'Proof of Service Uploaded', 5, '2026-02-14', 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000002', 'waiting_period_complete', 'Waiting Period Complete / Ready to File', 6, '2026-02-28', 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000002', 'petition_filed', 'Petition Filed', 7, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000002', 'court_date_scheduled', 'Court Date Scheduled', 8, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000002', 'court_appearance', 'Court Appearance', 9, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000002', 'court_outcome', 'Court Outcome Logged', 10, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000002', 'case_resolved', 'Case Resolved', 11, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000002', 'case_closed', 'Case Closed', 12, NULL, 'pending', true, NULL);

-- Case 4 (court_scheduled): milestones 1-8 done, upcoming court date
INSERT INTO public.case_milestones (case_id, milestone_key, label, order_index, due_date, status, client_visible, completed_at) VALUES
  ('d1b2c3d4-0001-4000-8000-000000000004', 'case_opened', 'Case Opened', 1, '2026-01-10', 'complete', true, '2026-01-10T09:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000004', '5_day_internal', '5-Day Internal Milestone', 2, '2026-01-15', 'complete', false, '2026-01-14T10:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000004', '14_day_demand_prepared', '14-Day Rent Demand Prepared', 3, '2026-01-20', 'complete', true, '2026-01-19T11:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000004', '14_day_demand_served', '14-Day Rent Demand Served', 4, '2026-01-22', 'complete', true, '2026-01-21T15:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000004', 'proof_of_service', 'Proof of Service Uploaded', 5, '2026-01-23', 'complete', true, '2026-01-22T16:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000004', 'waiting_period_complete', 'Waiting Period Complete / Ready to File', 6, '2026-02-06', 'complete', true, '2026-02-05T09:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000004', 'petition_filed', 'Petition Filed', 7, '2026-02-09', 'complete', true, '2026-02-08T14:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000004', 'court_date_scheduled', 'Court Date Scheduled', 8, '2026-02-16', 'complete', true, '2026-02-10T10:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000004', 'court_appearance', 'Court Appearance', 9, '2026-03-01', 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000004', 'court_outcome', 'Court Outcome Logged', 10, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000004', 'case_resolved', 'Case Resolved', 11, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000004', 'case_closed', 'Case Closed', 12, NULL, 'pending', true, NULL);

-- Case 5 (resolved): all milestones done
INSERT INTO public.case_milestones (case_id, milestone_key, label, order_index, due_date, status, client_visible, completed_at) VALUES
  ('d1b2c3d4-0001-4000-8000-000000000005', 'case_opened', 'Case Opened', 1, '2025-12-01', 'complete', true, '2025-12-01T09:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000005', '5_day_internal', '5-Day Internal Milestone', 2, '2025-12-06', 'complete', false, '2025-12-05T10:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000005', '14_day_demand_prepared', '14-Day Rent Demand Prepared', 3, '2025-12-11', 'complete', true, '2025-12-10T11:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000005', '14_day_demand_served', '14-Day Rent Demand Served', 4, '2025-12-13', 'complete', true, '2025-12-12T14:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000005', 'proof_of_service', 'Proof of Service Uploaded', 5, '2025-12-14', 'complete', true, '2025-12-13T15:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000005', 'waiting_period_complete', 'Waiting Period Complete / Ready to File', 6, '2025-12-28', 'complete', true, '2025-12-27T09:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000005', 'petition_filed', 'Petition Filed', 7, '2025-12-31', 'complete', true, '2025-12-30T10:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000005', 'court_date_scheduled', 'Court Date Scheduled', 8, '2026-01-07', 'complete', true, '2026-01-02T11:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000005', 'court_appearance', 'Court Appearance', 9, '2026-01-15', 'complete', true, '2026-01-15T10:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000005', 'court_outcome', 'Court Outcome Logged', 10, '2026-01-15', 'complete', true, '2026-01-15T14:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000005', 'case_resolved', 'Case Resolved', 11, '2026-01-20', 'complete', true, '2026-01-20T09:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000005', 'case_closed', 'Case Closed', 12, '2026-01-22', 'complete', true, '2026-01-22T10:00:00Z');

-- Cases 3 and 6: abbreviated milestones
INSERT INTO public.case_milestones (case_id, milestone_key, label, order_index, due_date, status, client_visible, completed_at) VALUES
  ('d1b2c3d4-0001-4000-8000-000000000003', 'case_opened', 'Case Opened', 1, '2026-01-15', 'complete', true, '2026-01-15T09:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000003', '5_day_internal', '5-Day Internal Milestone', 2, '2026-01-20', 'complete', false, '2026-01-19T10:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000003', '14_day_demand_prepared', '14-Day Rent Demand Prepared', 3, '2026-01-25', 'complete', true, '2026-01-24T11:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000003', '14_day_demand_served', '14-Day Rent Demand Served', 4, '2026-01-27', 'complete', true, '2026-01-26T14:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000003', 'proof_of_service', 'Proof of Service Uploaded', 5, '2026-01-28', 'complete', true, '2026-01-27T15:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000003', 'waiting_period_complete', 'Waiting Period Complete / Ready to File', 6, '2026-02-11', 'complete', true, '2026-02-10T09:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000003', 'petition_filed', 'Petition Filed', 7, '2026-02-14', 'complete', true, '2026-02-13T10:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000003', 'court_date_scheduled', 'Court Date Scheduled', 8, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000003', 'court_appearance', 'Court Appearance', 9, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000003', 'court_outcome', 'Court Outcome Logged', 10, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000003', 'case_resolved', 'Case Resolved', 11, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000003', 'case_closed', 'Case Closed', 12, NULL, 'pending', true, NULL);

INSERT INTO public.case_milestones (case_id, milestone_key, label, order_index, due_date, status, client_visible, completed_at) VALUES
  ('d1b2c3d4-0001-4000-8000-000000000006', 'case_opened', 'Case Opened', 1, '2026-01-20', 'complete', true, '2026-01-20T09:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000006', '5_day_internal', '5-Day Internal Milestone', 2, '2026-01-25', 'complete', false, '2026-01-24T10:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000006', '14_day_demand_prepared', '14-Day Rent Demand Prepared', 3, '2026-01-30', 'complete', true, '2026-01-29T11:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000006', '14_day_demand_served', '14-Day Rent Demand Served', 4, '2026-02-01', 'complete', true, '2026-01-31T14:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000006', 'proof_of_service', 'Proof of Service Uploaded', 5, '2026-02-02', 'complete', true, '2026-02-01T15:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000006', 'waiting_period_complete', 'Waiting Period Complete / Ready to File', 6, '2026-02-16', 'complete', true, '2026-02-15T09:00:00Z'),
  ('d1b2c3d4-0001-4000-8000-000000000006', 'petition_filed', 'Petition Filed', 7, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000006', 'court_date_scheduled', 'Court Date Scheduled', 8, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000006', 'court_appearance', 'Court Appearance', 9, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000006', 'court_outcome', 'Court Outcome Logged', 10, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000006', 'case_resolved', 'Case Resolved', 11, NULL, 'pending', true, NULL),
  ('d1b2c3d4-0001-4000-8000-000000000006', 'case_closed', 'Case Closed', 12, NULL, 'pending', true, NULL);

-- 8. Court events (case 4 has upcoming, case 5 had past)
INSERT INTO public.court_events (case_id, event_type, start_at, court_name, location, notes) VALUES
  ('d1b2c3d4-0001-4000-8000-000000000004', 'hearing', '2026-03-01T10:00:00Z', 'Buffalo City Court Housing Part', '50 Delaware Ave, Buffalo, NY 14202', 'Initial hearing - nonpayment'),
  ('d1b2c3d4-0001-4000-8000-000000000005', 'hearing', '2026-01-15T09:30:00Z', 'Buffalo City Court Housing Part', '50 Delaware Ave, Buffalo, NY 14202', 'Final hearing'),
  ('d1b2c3d4-0001-4000-8000-000000000005', 'judgment', '2026-01-15T14:00:00Z', 'Buffalo City Court Housing Part', '50 Delaware Ave, Buffalo, NY 14202', 'Judgment in favor of landlord');

-- 9. System settings (Erie County defaults)
INSERT INTO public.system_settings (setting_key, setting_value_json) VALUES
  ('jurisdiction_defaults', '{"state": "NY", "county": "Erie", "default_notice_days": 14, "reminder_offsets": [3, 1]}'),
  ('courts_list', '["Buffalo City Court Housing Part", "Erie County Court"]'),
  ('legal_disclaimer', '"This software is for case tracking and communication only. It does not provide legal advice. Users are responsible for confirming legal requirements with counsel."');
