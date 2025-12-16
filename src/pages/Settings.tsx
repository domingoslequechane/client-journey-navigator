import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Building2, Save, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AgencySettings {
  id: string;
  agency_name: string;
  headquarters: string | null;
  nuit: string | null;
  representative_name: string | null;
  representative_position: string | null;
}

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AgencySettings>({
    id: '',
    agency_name: '',
    headquarters: '',
    nuit: '',
    representative_name: '',
    representative_position: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('agency_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar as configurações', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('agency_settings')
        .update({
          agency_name: settings.agency_name,
          headquarters: settings.headquarters,
          nuit: settings.nuit,
          representative_name: settings.representative_name,
          representative_position: settings.representative_position,
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Configurações salvas com sucesso' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar as configurações', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/app');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Informações da agência</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Dados da Agência
          </CardTitle>
          <CardDescription>
            Configure as informações básicas da sua agência
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="agency_name">Nome da Agência</Label>
            <Input
              id="agency_name"
              placeholder="Ex: Onix Agence"
              value={settings.agency_name}
              onChange={(e) => setSettings(prev => ({ ...prev, agency_name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="headquarters">Sede Social</Label>
            <Input
              id="headquarters"
              placeholder="Ex: Av. Eduardo Mondlane, 123 - Maputo"
              value={settings.headquarters || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, headquarters: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nuit">NUIT</Label>
            <Input
              id="nuit"
              placeholder="Ex: 123456789"
              value={settings.nuit || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, nuit: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="representative_name">Nome do Representante</Label>
              <Input
                id="representative_name"
                placeholder="Ex: João Silva"
                value={settings.representative_name || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, representative_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="representative_position">Cargo do Representante</Label>
              <Input
                id="representative_position"
                placeholder="Ex: Diretor Geral"
                value={settings.representative_position || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, representative_position: e.target.value }))}
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
