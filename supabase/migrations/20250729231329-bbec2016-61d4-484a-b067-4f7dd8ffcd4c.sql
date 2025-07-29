-- Fix security issues by setting search_path for functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile for new user
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  
  -- Insert default pipeline stages
  INSERT INTO public.pipeline_stages (user_id, name, position, is_default) VALUES
    (NEW.id, 'Aguardando atendimento', 1, true),
    (NEW.id, 'Em Atendimento', 2, true),
    (NEW.id, 'Visita Agendada', 3, true),
    (NEW.id, 'Venda Ganha', 4, true),
    (NEW.id, 'Venda Perdida', 5, true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';