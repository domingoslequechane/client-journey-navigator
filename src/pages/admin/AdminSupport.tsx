import { AnimatedContainer } from '@/components/ui/animated-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Mail, Phone } from 'lucide-react';

export default function AdminSupport() {
  return (
    <div className="p-6 space-y-6">
      <AnimatedContainer animation="fade-up">
        <div>
          <h1 className="text-3xl font-bold">Suporte Técnico</h1>
          <p className="text-muted-foreground">Central de suporte e atendimento</p>
        </div>
      </AnimatedContainer>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatedContainer animation="fade-up" delay={0.1}>
          <Card>
            <CardHeader>
              <div className="p-2 rounded-lg bg-blue-500/10 w-fit">
                <MessageSquare className="h-6 w-6 text-blue-500" />
              </div>
              <CardTitle>Chat ao Vivo</CardTitle>
              <CardDescription>
                Atendimento em tempo real com usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Em breve disponível. O sistema de chat ao vivo permitirá atendimento 
                direto aos usuários com dúvidas ou problemas.
              </p>
            </CardContent>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer animation="fade-up" delay={0.2}>
          <Card>
            <CardHeader>
              <div className="p-2 rounded-lg bg-green-500/10 w-fit">
                <Mail className="h-6 w-6 text-green-500" />
              </div>
              <CardTitle>Tickets de Suporte</CardTitle>
              <CardDescription>
                Sistema de tickets para acompanhamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Em breve disponível. Sistema de tickets para registrar e acompanhar 
                solicitações de suporte dos usuários.
              </p>
            </CardContent>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer animation="fade-up" delay={0.3}>
          <Card>
            <CardHeader>
              <div className="p-2 rounded-lg bg-purple-500/10 w-fit">
                <Phone className="h-6 w-6 text-purple-500" />
              </div>
              <CardTitle>Central de Ajuda</CardTitle>
              <CardDescription>
                Base de conhecimento e FAQs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Em breve disponível. Crie e gerencie artigos de ajuda, FAQs e 
                tutoriais para os usuários do sistema.
              </p>
            </CardContent>
          </Card>
        </AnimatedContainer>
      </div>

      <AnimatedContainer animation="fade-up" delay={0.4}>
        <Card>
          <CardHeader>
            <CardTitle>Feedbacks de Suporte</CardTitle>
            <CardDescription>
              Os feedbacks com tipo "Suporte Técnico" podem ser gerenciados na página de Feedbacks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Acesse a página de Feedbacks no menu lateral para visualizar e responder 
              aos pedidos de suporte técnico enviados pelos usuários.
            </p>
          </CardContent>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
