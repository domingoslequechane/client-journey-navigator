import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Wrench } from "lucide-react";

type DiagnosticsResponse = {
  configured: {
    storeId: string | null;
    variants: Record<string, string | null | undefined>;
  };
  storeIdValid: boolean;
  stores: Array<{ id: string; name?: string; slug?: string; test_mode?: boolean }>;
};

export function LemonSqueezyDiagnosticsDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DiagnosticsResponse | null>(null);
  const [raw, setRaw] = useState<string>("");

  const summary = useMemo(() => {
    if (!data) return null;

    const configuredStoreId = data.configured.storeId;
    const storeCount = data.stores?.length ?? 0;

    return {
      configuredStoreId,
      storeCount,
      storeIdValid: data.storeIdValid,
    };
  }, [data]);

  const run = async () => {
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("lemonsqueezy-diagnostics");

      if (res.error) {
        throw new Error(res.error.message || "Falha ao rodar diagnóstico");
      }

      const parsed = res.data as DiagnosticsResponse;
      setData(parsed);
      setRaw(JSON.stringify(parsed, null, 2));

      toast({
        title: "Diagnóstico LemonSqueezy",
        description: parsed.storeIdValid
          ? "Configuração OK: Store ID encontrado na sua conta."
          : "Store ID configurado não foi encontrado na sua conta (provável causa do 404).",
        variant: parsed.storeIdValid ? "default" : "destructive",
      });
    } catch (e: any) {
      console.error("LemonSqueezy diagnostics error:", e);
      toast({
        title: "Erro no diagnóstico",
        description: e?.message || "Não foi possível executar o diagnóstico",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && !data && !loading) {
          void run();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Wrench className="h-4 w-4" />
          Diagnóstico LemonSqueezy
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Diagnóstico LemonSqueezy</DialogTitle>
          <DialogDescription>
            Isto lista as <strong>stores acessíveis</strong> pela API key atual e valida o
            <strong> Store ID</strong> configurado no backend.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {summary ? (
              <span>
                Store ID configurado: <strong>{summary.configuredStoreId ?? "(vazio)"}</strong> • Stores
                encontradas: <strong>{summary.storeCount}</strong> • Resultado:{" "}
                <strong>{summary.storeIdValid ? "OK" : "INVÁLIDO"}</strong>
              </span>
            ) : (
              <span>Executando diagnóstico…</span>
            )}
          </div>

          <Button onClick={run} disabled={loading} variant="secondary" className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Reexecutar
          </Button>
        </div>

        <ScrollArea className="h-[420px] rounded-md border bg-muted/20">
          <pre className="p-4 text-xs leading-relaxed">
            {loading && !raw ? "Carregando…" : raw || "Sem dados"}
          </pre>
        </ScrollArea>

        <p className="text-xs text-muted-foreground">
          Se <strong>storeIdValid</strong> vier como <strong>false</strong>, copie um dos IDs em
          <strong> stores</strong> e me diga qual é o correto para eu atualizar o secret
          <strong> LEMONSQUEEZY_STORE_ID</strong>.
        </p>
      </DialogContent>
    </Dialog>
  );
}
