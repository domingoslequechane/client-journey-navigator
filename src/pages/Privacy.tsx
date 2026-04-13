import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { BackToTop } from '@/components/BackToTop';

export default function PrivacyPolicy() {
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
          <h1 className="text-4xl md:text-5xl font-extrabold mb-8">Política de Privacidade</h1>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
            <p className="text-sm font-medium mb-8 bg-muted/50 p-4 rounded-xl border border-border">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
            
            <div className="space-y-12">
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">1. Por Que Uma Política de Privacidade?</h2>
                <p>Sua privacidade e segurança não são apenas obrigações jurídicas para nós, são as premissas primárias do nosso modelo de trabalho. Esta Política de Privacidade obedece ao escopo legal da LGPD no Brasil (Lei Geral de Proteção de Dados - nº 13.709/2018) e de modelos internacionais como o GDPR europeu. Ela descreve exatamente o que fazemos, por que precisamos dessas informações e onde as armazenamos.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">2. Os Dados Que Coletamos</h2>
                <p>Podemos coletar e processar os seguintes tipos de informações em sua conta e atividade:</p>
                <ul className="list-disc pl-6 mt-4 space-y-2">
                  <li><strong>Dados de Registro (PII):</strong> Nome da agência, nome pessoal do responsável, e-mail comercial, telefone corporativo, localização.</li>
                  <li><strong>Dados de Atividade (Uso):</strong> Tipos e periodicidade de cliques nos painéis, IPs associados, configurações navegacionais (dispositivo e browser) a fim de otimizar os serviços e investigar erros sistêmicos.</li>
                  <li><strong>Dados de Transação:</strong> Informações sobre planos mensais/anuais contratados. Detalhes de fatura ou cartão são sempre processados fora de nossos servidores, por empresas globais de pagamento parceiras (como Stripe/MercadoPago).</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">3. Como Usamos Seus Dados e Cookies</h2>
                <p>Nós utilizamos pequenos arquivos (Cookies) apenas para recursos essenciais da plataforma: o de salvar a sua sessão ativa. Se você fechou nosso site, os cookies dizem à plataforma quem você é para poupar novo login. Além disso, as demais informações são consumidas para:</p>
                <ul className="list-disc pl-6 mt-4 space-y-2">
                  <li>O correto provisionamento de faturas automatizado.</li>
                  <li>Fornecimento da base formativa aos Agentes IA para treinar a sua base comercial individual.</li>
                  <li>O envio esporádico (sob consentimento) de e-mails contendo faturamentos atrasados, re-engajamento ou mudanças essenciais desta Política.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">4. Isolamento Cibernético e Camada Subjacente</h2>
                <p>A Qualify se baseia em uma infraestrutura arquitetural isolada a partir de <strong>Row Level Security (RLS)</strong> no banco de dados e <em>Edge Functions</em> privadas e criptografadas. Resumindo:</p>
                <p className="mt-2">Nenhum cliente jamais veria os dados das negociações confidenciais, base de WhatsApp e clientes de concorrência que pertençam a terceiros devido a essa garantia instalada direto no "motor" do servidor. Somente os Tokens únicos (vinculados ao dono da Agência e respectivos colaboradores cadastrados explicitamente) são capazes de destravar e liberar visualizações pontuais sobre a mesma carteira de <em>leads</em>.</p>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">5. Compartilhamento e Terceirizados</h2>
                <p><strong>NÃO vendemos ou repassamos sua base de Leads/Contatos para ninguém.</strong> A listagem da sua agência é privada. Em caso da prestação dos seus serviços, o compartilhamento só é feito em canais criptografados para sub-processadores primários tais como:</p>
                <ul className="list-disc pl-6 mt-4 space-y-2">
                  <li>Amazon Web Services (AWS) e tecnologias do Supabase onde a hospedagem é encriptada (AES-256 no repouso).</li>
                  <li>Gateways financeiros obrigatórios apenas em momentos de faturamento e notas.</li>
                  <li>APIs de Modelos de Linguagem de I.A oficiais que possuem os próprios Termos rigorosos de não-treinamento global de seus relatórios.</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">6. Seus Direitos enquanto Titular (Art. 18 LGPD)</h2>
                <p>Conforme os preceitos globais atuais de ética e controle aos usuários, você é possuidor integral de todos os seus Direitos:</p>
                <ul className="list-disc pl-6 mt-4 space-y-2">
                  <li><strong>Direito à Retificação:</strong> Corrigir danos cadastrais incompletos, inexatos ou desatualizados.</li>
                  <li><strong>Direito à Eliminação:</strong> Exigir exclusão terminante do seu registro da nossa base caso encerre toda rotina como associado corporativo da Qualify e sem prejuízo à conformidade legal imposta via retenção mínima do estado brasileiro.</li>
                  <li><strong>Direito à Transparência:</strong> Obter listagem legível sobre o panorama formativo das eventuais partilhas (sub-processadores externos citados acima).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">7. Fale com nosso Encarregado de Dados</h2>
                <p>Quaisquer questões sobre manuseio, exclusões forçadas e denúncias atreladas à Privacidade poderão ser levantadas em comunicação oficial com nossa base matriz, contatando diretamente nosso Data Protection Officer (DPO) na plataforma oficial de contato apresentada no site ou nos botões de atendimento direto do próprio cliente contido aliás.</p>
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
