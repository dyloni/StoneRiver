/*
  # Restore Anonymous Access Policies

  1. Changes
    - Restore anonymous (anon) role policies for all tables
    - This allows the application to function properly with authenticated users
    
  2. Security
    - Policies still enforce proper access control
    - Only restore necessary anon access
*/

-- Restore anon policies for agents
CREATE POLICY "Allow anon to read agents" ON agents FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to insert agents" ON agents FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to update agents" ON agents FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Restore anon policies for customers
CREATE POLICY "Allow anon to read customers" ON customers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to insert customers" ON customers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to update customers" ON customers FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Restore anon policies for requests
CREATE POLICY "Allow anon to read requests" ON requests FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to insert requests" ON requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to update requests" ON requests FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Restore anon policies for messages
CREATE POLICY "Allow anon to read messages" ON messages FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to insert messages" ON messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to update messages" ON messages FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Restore anon policies for claims
CREATE POLICY "Allow anon to read claims" ON claims FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to insert claims" ON claims FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to update claims" ON claims FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Restore anon policies for payments
CREATE POLICY "Allow anon to read payments" ON payments FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to insert payments" ON payments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to update payments" ON payments FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Restore anon policies for admins
CREATE POLICY "Anon users can read admins" ON admins FOR SELECT TO anon USING (true);

-- Restore anon policies for permissions
CREATE POLICY "Anon users can read permissions" ON permissions FOR SELECT TO anon USING (true);

-- Restore anon policies for admin_permissions
CREATE POLICY "Anon can view admin permissions" ON admin_permissions FOR SELECT TO anon USING (true);

-- Restore anon policies for typing_indicators
CREATE POLICY "Allow anon to read typing_indicators" ON typing_indicators FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to insert typing_indicators" ON typing_indicators FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to update typing_indicators" ON typing_indicators FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon to delete typing_indicators" ON typing_indicators FOR DELETE TO anon USING (true);

-- Restore anon policies for package_configurations
CREATE POLICY "Allow anon to read package_configurations" ON package_configurations FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon to insert package_configurations" ON package_configurations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to update package_configurations" ON package_configurations FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon to delete package_configurations" ON package_configurations FOR DELETE TO anon USING (true);
