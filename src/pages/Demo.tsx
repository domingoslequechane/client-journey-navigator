import { Link, NavLink, Route, Routes } from "react-router-dom";
import { useMemo } from "react";
import { getDemoClients } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Workflow,
  Users,
  ArrowRight,
  Lock,
  Sparkles,
} from "lucide-react";

function DemoBanner() {
  return (
    <div className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          Modo Demonstração
        </Badge>
        <p className="text-sm text-muted-foreground">
          Seus dados não serão salvos. Explore o produto e depois crie sua conta.
        </p>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/auth">
            <Button size="sm" className="gap-2">
              Criar conta e salvar
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function DemoNav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "text-sm px-3 py-2 rounded-md transition-colors",
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    );

  return (
    <div className="border-b bg-card">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-2">
        <Link to="/" className="font-bold tracking-tight mr-2">
          Qualify
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <NavLink to="/demo" end className={linkClass}>
          <span className="inline-flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </span>
        </NavLink>
        <NavLink to="/demo/pipeline" className={linkClass}>
          <span className="inline-flex items-center gap-2">
            <Workflow className="h-4 w-4" /> Pipeline
          </span>
        </NavLink>
        <NavLink to="/demo/clients" className={linkClass}>
          <span className="inline-flex items-center gap-2">
            <Users className="h-4 w-4" /> Clientes
          </span>
        </NavLink>
        <div className="ml-auto hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> somente leitura
        </div>
      </div>
    </div>
  );
}

function DemoDashboard() {
  const clients = useMemo(() => getDemoClients(), []);

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => !c.paused).length;
  const hotLeads = clients.filter((c) => c.temperature === "hot").length;
  const fixedRevenue = clients
    .filter((c) => ["production", "campaigns", "retention", "loyalty"].includes(c.stage))
    .reduce((sum, c) => sum + (c.monthlyBudget || 0), 0);

  const conversionRate = Math.round(
    (clients.filter((c) => c.stage !== "prospecting").length / totalClients) * 100
  );

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Veja o impacto em números antes de criar conta.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground">Total cadastrados (demo)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeClients}</div>
            <p className="text-xs text-muted-foreground">Sem pausas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Leads quentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hotLeads}</div>
            <p className="text-xs text-muted-foreground">Priorize follow-ups</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Receita fixa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">MZN {fixedRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Clientes em operação</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Aha moment em 30 segundos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
            <li>Abra o Pipeline e clique em um cliente.</li>
            <li>Veja etapas, orçamento e progresso.</li>
            <li>Crie sua conta para salvar seus próprios dados.</li>
          </ol>
          <Separator />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Taxa de conversão (exemplo)</p>
              <p className="text-xs text-muted-foreground">Prospects que avançaram no funil</p>
            </div>
            <div className="w-48">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{conversionRate}%</span>
                <span>{totalClients} clientes</span>
              </div>
              <Progress value={conversionRate} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Link to="/demo/pipeline">
          <Button variant="outline" className="gap-2">
            Ver Pipeline <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link to="/auth">
          <Button className="gap-2">
            Criar conta
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function stageLabel(stage: string) {
  const map: Record<string, string> = {
    prospecting: "Prospecção",
    qualification: "Reunião",
    closing: "Contratação",
    production: "Produção",
    campaigns: "Tráfego",
    retention: "Retenção",
    loyalty: "Fidelização",
  };
  return map[stage] || stage;
}

function DemoPipeline() {
  const clients = useMemo(() => getDemoClients(), []);

  const stages: { id: string; title: string }[] = [
    { id: "prospecting", title: "Prospecção" },
    { id: "qualification", title: "Reunião" },
    { id: "closing", title: "Contratação" },
    { id: "production", title: "Produção" },
    { id: "campaigns", title: "Tráfego" },
    { id: "retention", title: "Retenção" },
  ];

  return (
    <div className="p-4 md:p-8 h-full">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Pipeline</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Funil preenchido para você entender o fluxo.
          </p>
        </div>
        <Link to="/auth">
          <Button size="sm" className="gap-2">
            Quero isso na minha empresa <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((s) => {
          const stageClients = clients.filter((c) => c.stage === s.id);
          return (
            <div key={s.id} className="w-72 shrink-0">
              <div className="rounded-t-xl border border-b-0 bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{s.title}</div>
                  <Badge variant="secondary">{stageClients.length}</Badge>
                </div>
              </div>
              <div className="rounded-b-xl border bg-card p-3 space-y-3 min-h-[420px]">
                {stageClients.map((c) => (
                  <div key={c.id} className="rounded-xl border p-3">
                    <div className="font-medium">{c.companyName}</div>
                    <div className="text-xs text-muted-foreground">{c.contactName}</div>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="text-muted-foreground">Orçamento</span>
                      <span className="font-medium">MZN {c.monthlyBudget.toLocaleString()}</span>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                        <span>Progresso</span>
                        <span>{c.progress}/9</span>
                      </div>
                      <Progress value={(c.progress / 9) * 100} className="h-1.5" />
                    </div>
                  </div>
                ))}
                {stageClients.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Sem clientes nesta etapa (demo)
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DemoClients() {
  const clients = useMemo(() => getDemoClients(), []);

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Clientes</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Uma lista realista para você navegar.
          </p>
        </div>
        <Link to="/auth">
          <Button size="sm" className="gap-2">
            Criar conta <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clients.map((c) => (
          <Card key={c.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="truncate">{c.companyName}</span>
                <Badge variant="outline">{stageLabel(c.stage)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Contato:</span> {c.contactName}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Email:</span> {c.email}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Telefone:</span> {c.phone}
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Orçamento mensal</span>
                <span className="font-medium">MZN {c.monthlyBudget.toLocaleString()}</span>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Checklist</span>
                  <span>{c.progress}/9</span>
                </div>
                <Progress value={(c.progress / 9) * 100} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Demo() {
  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <DemoNav />
      <Routes>
        <Route index element={<DemoDashboard />} />
        <Route path="pipeline" element={<DemoPipeline />} />
        <Route path="clients" element={<DemoClients />} />
      </Routes>
    </div>
  );
}
