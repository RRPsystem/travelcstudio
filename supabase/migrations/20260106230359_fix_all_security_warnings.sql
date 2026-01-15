/*
  # Fix All Remaining Security Warnings

  1. Security Changes
    - Update all views to use SECURITY INVOKER
    - Ensure project_approvals view has SECURITY INVOKER
    - Ensure project_members_view has SECURITY INVOKER
    
  2. Notes
    - All SECURITY DEFINER functions already have search_path (verified)
    - All views should use SECURITY INVOKER for better security
    - This eliminates the ability for views to bypass RLS
*/

-- Update project_approvals to use SECURITY INVOKER
DROP VIEW IF EXISTS public.project_approvals CASCADE;
CREATE VIEW public.project_approvals
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.title,
  p.goal,
  p.budget,
  p.deadline,
  p.status,
  p.created_at,
  p.updated_at,
  p.approval_status,
  p.approved_by,
  p.approved_at,
  p.budget_approved,
  p.budget_approved_by,
  p.budget_approved_at,
  p.rejection_reason,
  (approver.first_name || ' ' || approver.last_name) AS approved_by_name,
  (budget_approver.first_name || ' ' || budget_approver.last_name) AS budget_approved_by_name
FROM projects p
LEFT JOIN profiles approver ON p.approved_by = approver.id
LEFT JOIN profiles budget_approver ON p.budget_approved_by = budget_approver.id;

-- Grant access
GRANT SELECT ON public.project_approvals TO authenticated;

-- Update project_members_view to use SECURITY INVOKER
DROP VIEW IF EXISTS public.project_members_view CASCADE;
CREATE VIEW public.project_members_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  project_id,
  user_id,
  role,
  last_update_at,
  created_at
FROM project_members pm
WHERE (user_id = auth.uid()) OR check_project_access(project_id);

-- Grant access
GRANT SELECT ON public.project_members_view TO authenticated;