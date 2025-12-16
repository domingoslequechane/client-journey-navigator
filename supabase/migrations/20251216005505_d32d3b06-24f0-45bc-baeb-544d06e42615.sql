-- Create profile for the logged-in user who doesn't have one
INSERT INTO public.profiles (id, full_name, role)
VALUES ('481f00a6-29b2-487b-84e9-f8f1e8b0efa3', 'Domingos Lequechane', 'admin')
ON CONFLICT (id) DO NOTHING;