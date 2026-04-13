import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { BackToTop } from '@/components/BackToTop';

export default function Terms() {
  const { t } = useTranslation('landing');
  const [isScrolled, setIsScrolled] = useState(false);
  
  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <LandingHeader t={t} isScrolled={isScrolled} />
      
      <div className="flex-1 w-full bg-background text-foreground font-sans relative overflow-x-hidden pt-32 lg:pt-40 pb-24">
        <main className="container mx-auto px-6 max-w-4xl relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-8">Termos & Condições</h1>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
            <p className="text-sm font-medium mb-8 bg-muted/50 p-4 rounded-xl border border-border">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
            
            <div className="space-y-12">
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">1. Aceitação dos Termos</h2>
                <p>Ao acessar e utilizar a plataforma Qualify, você concorda em cumprir e estar vinculado aos seguintes Termos de Serviço. Estes termos aplicam-se a todos os visitantes, usuários, agências e outros clientes que acessam ou utilizam nosso software. A concordância com estes termos é manifestada pela criação de uma conta em nossa plataforma. Se você não concordar com qualquer parte destes termos, não deverá criar uma conta ou usar nosso serviço.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">2. Descrição do Serviço</h2>
                <p>A Qualify é uma plataforma B2B <em>SaaS</em> (Software as a Service) desenvolvida para agências digitais e consultores, fornecendo ferramentas de gestão de clientes (CRM), geração de documentos, assistentes de inteligência artificial e publicação em redes sociais. A Qualify atua como intermediadora de tecnologia administrativa e nunca atuará no suporte direto final dos seus próprios clientes.</p>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">3. Registro, Credenciais e Segurança</h2>
                <p>Para usar grande parte do Serviço, será necessário o registro de uma conta de Agência. O usuário compromete-se a: (a) prover informações precisas e atuais; (b) manter a segurança de sua senha e tokens. A Qualify baseia sua segurança em modelos rígidos de banco de dados (Row Level Security); contudo, qualquer invasão decorrente do vazamento das senhas do próprio usuário é de inteira responsabilidade do mesmo.</p>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">4. Planos, Cobrança e Cancelamento</h2>
                <p>Nossos serviços são oferecidos predominantemente de forma pré-paga via assinatura (Planos Lança, Arco e Catapulta). As cobranças ocorrem mensalmente ou anualmente, conforme a escolha do plano. <br/><br/>
                <strong>Políticas de Cancelamento:</strong> O assinante poderá cancelar o seu plano a qualquer momento pelo painel financeiro. Após o cancelamento, a sua assinatura e o seu acesso continuarão ativos até que termine o período pelo qual já pagou, eximindo o encerramento imediato.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">5. Política de Uso Aceitável</h2>
                <p>Ao acessar o software, você concorda expressamente em <strong>NÃO</strong>:</p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Utilizar o serviço para o envio de mensagens irregulares ou Spam pelo módulo WhatsApp IA.</li>
                  <li>Incentivar práticas de fraude ou atividades ilegais sob a legislação do país residente.</li>
                  <li>Engenharia reversa ou tentar quebrar os sistemas de banco de dados, chaves de API, e fluxos de segurança do servidor.</li>
                  <li>Inserir intencionalmente arquivos corrompidos, malwares, cavalos de tróia e vírus em nosso ecossistema de armazenamento (Storage).</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">6. Propriedade Intelectual (Nossa e Sua)</h2>
                <p><strong>De quem é o software:</strong> Todos os direitos autorais, marcas registradas e propriedades do código na plataforma Qualify são de nossa total titularidade. Nenhuma licença ou direito será concedido a qualquer usuário sem permissão escrita.</p>
                <p className="mt-2"><strong>De quem são os seus clientes:</strong> O conteúdo dos seus clientes, a carteira, contatos e os documentos gerados pela plataforma através da conta da sua agência são inteiramente de responsabilidade e propriedade legal SUA. Não somos proprietários do seu capital corporativo inserido dentro do sistema.</p>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">7. Estabilidade de Serviço e SLA</h2>
                <p>A Qualify se empenha ativamente (com fornecedores <em>Cloud</em> em nuvem robustos) em proporcionar até 99.9% de uptime na plataforma. No entanto, o serviço é provido "No estado em que se encontra", não nos responsabilizando legal ou civilmente caso haja alguma perda momentânea de faturamento ou de comunicação por meio da plataforma devido a uma parada de rede, interrupções nos serviços de APIs de Inteligência Artificial ou atrasos inesperados (bugs).</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">8. Foro e Jurisdição Específicos</h2>
                <p>Estes Termos serão regidos e interpretados de acordo com as leis do território brasileiro. Quaisquer impasses serão avaliados no Foro da comarca onde se instala a sede matriz da Qualify (como previsto no estatuto de criação ou em São Paulo, SP), renunciando as partes qualquer outro, por mais privilegiado que fosse. O presente acordo revoga todos e quaisquer comunicados anteriores com as partes assinantes.</p>
              </section>
            </div>
          </div>
        </main>
      </div>

      <LandingFooter />
      <BackToTop />
    </div>
  );
}
