-- Subscription plan changes must go through authenticated server actions.
-- The server validates the current session and workspace role before using the
-- service-role client for the narrowly scoped mock billing upsert.
drop policy if exists "Owners and admins can insert subscriptions" on public.subscriptions;
drop policy if exists "Owners and admins can update subscriptions" on public.subscriptions;
revoke insert, update, delete on public.subscriptions from authenticated;
