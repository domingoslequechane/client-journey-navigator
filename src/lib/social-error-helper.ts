export const translateSocialError = (error: string | any): string => {
    const msg = typeof error === 'string' ? error : error?.message || '';

    if (!msg) return 'Ocorreu um erro inesperado. Por favor, tente novamente.';

    // Instagram Aspect Ratio
    if (msg.includes("Aspect ratio") && msg.includes("Instagram")) {
        return "O formato da imagem não é suportado pelo Instagram. Por favor, corte a sua imagem para o formato vertical (4:5) ou quadrado (1:1) antes de publicar.";
    }

    // Auth/Token errors
    if (msg.includes("Invalid access token") || msg.includes("token has expired")) {
        return "A ligação com a sua conta expirou. Por favor, reconecte a sua conta nas configurações de Social Media.";
    }

    if (msg.includes("not authorized") || msg.includes("permissions")) {
        return "A sua conta não tem as permissões necessárias para publicar. Verifique se a conta é Profissional ou Criador de Conteúdo.";
    }

    // Media related
    if (msg.includes("Media upload failed") || msg.includes("uploading")) {
        return "Não conseguimos processar o ficheiro agora. Verifique a sua internet e tente carregar novamente.";
    }

    if (msg.includes("resolution") || msg.includes("too low")) {
        return "A qualidade da imagem é demasiado baixa para esta rede social. Tente usar um ficheiro com maior resolução.";
    }

    if (msg.includes("duration") && (msg.includes("video") || msg.includes("Reels"))) {
        return "O vídeo tem uma duração não suportada. Verifique se o vídeo tem entre 3 segundos e 15 minutos.";
    }

    // Rate limits
    if (msg.includes("Rate limit") || msg.includes("Too many requests")) {
        return "Muitas publicações em pouco tempo. Por favor, aguarde alguns minutos antes de tentar novamente.";
    }

    // General fallback translations
    if (msg.includes("Network Error") || msg.includes("Failed to fetch")) {
        return "Erro de ligação. Verifique se está ligado à internet.";
    }

    if (msg.includes("Unexpected token")) {
        return "O servidor deu uma resposta inválida. Tente atualizar a página.";
    }

    // If no match, return a clean version of the message or a default
    return msg.length > 150 ? "Ocorreu um erro técnico ao processar a publicação. Tente ajustar o conteúdo ou as imagens." : msg;
};
