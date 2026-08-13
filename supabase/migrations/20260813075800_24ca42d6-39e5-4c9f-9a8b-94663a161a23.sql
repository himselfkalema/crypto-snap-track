DROP POLICY "Users mark notifications read" ON public.notifications;
CREATE POLICY "Users mark notifications read" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users update own offers" ON public.offers;
CREATE POLICY "Users update own offers" ON public.offers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY "Update own messages" ON public.trade_messages;
CREATE POLICY "Update own messages" ON public.trade_messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

DROP POLICY "Participants update trade" ON public.trades;
CREATE POLICY "Participants update trade" ON public.trades FOR UPDATE TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'::app_role));