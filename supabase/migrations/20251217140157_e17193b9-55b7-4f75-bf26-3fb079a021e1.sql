-- Allow users to view their own login history
CREATE POLICY "Users can view own login history"
ON public.login_history
FOR SELECT
USING (auth.uid() = user_id);