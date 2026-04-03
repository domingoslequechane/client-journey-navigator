import os

file_path = 'src/components/studio/CarouselSquadView.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# Replacements
code = code.replace('FlyerSquadView', 'CarouselSquadView')
code = code.replace('FlyerSquadAgent', 'FlyerSquadAgent')
code = code.replace('flyer-squad-orchestrator', 'carousel-squad-orchestrator')
code = code.replace('studio_flyers', 'studio_carousels')
code = code.replace('flyer_specialist_mode', 'carousel_specialist_mode')
code = code.replace('flyer-history', 'carousel-history')
code = code.replace('CRIAR FLYER', 'CRIAR CARROSEL')
code = code.replace('Gerador de Flyer', 'Gerador de Carrossel')
code = code.replace('Flyer gerado', 'Carrossel gerado')
code = code.replace('Gerando Flyer', 'Gerando Carrossel')
code = code.replace('Gerar Flyer Profissional', 'Gerar Carrossel Profissional')
code = code.replace('Flyer Engine', 'Carousel Engine')
code = code.replace('flyer-', 'carousel-')
code = code.replace('Nenhum flyer', 'Nenhum carrossel')
code = code.replace('Detalhes do Flyer', 'Detalhes do Carrossel')
code = code.replace('Criar outro Flyer', 'Criar outro Carrossel')
code = code.replace('FLYER_OBJECTIVES', 'CAROUSEL_OBJECTIVES')
code = code.replace('FLYER_TONES', 'CAROUSEL_TONES')
code = code.replace('FLYER_COPY_LENGTHS', 'CAROUSEL_COPY_LENGTHS')
code = code.replace('FLYER_SIZES', 'CAROUSEL_SIZES')

if 'numberOfSlides' not in code:
    code = code.replace("const [aspectRatio, setAspectRatio] = useState<string>('square');", "const [aspectRatio, setAspectRatio] = useState<string>('square');\n  const [numberOfSlides, setNumberOfSlides] = useState<number>(3);")
    
    code = code.replace("ratio: CAROUSEL_SIZES.find(s => s.id === aspectRatio)?.ratio || '1:1',", "ratio: CAROUSEL_SIZES.find(s => s.id === aspectRatio)?.ratio || '1:1',\n        numberOfSlides,")
    
    number_of_slides_ui = """
        {/* Number of Slides */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Número de Slides
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                onClick={() => {
                  setNumberOfSlides(num);
                  saveSettings({ numberOfSlides: num });
                }}
                className={cn(
                  "py-2.5 rounded-xl border text-[11px] font-bold transition-all",
                  numberOfSlides === num 
                    ? "bg-primary border-primary text-white shadow-lg" 
                    : "bg-background border-primary/10 text-muted-foreground hover:border-primary/30"
                )}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
"""
    code = code.replace('{/* Objective */}', number_of_slides_ui + '\n        {/* Objective */}')
    code = code.replace('if (settings.aspectRatio) setAspectRatio(settings.aspectRatio);', 'if (settings.aspectRatio) setAspectRatio(settings.aspectRatio);\n      if (settings.numberOfSlides) setNumberOfSlides(settings.numberOfSlides);')

if 'resultImages' not in code:
    code = code.replace('const [resultImage, setResultImage] = useState<string | null>(null);', 'const [resultImages, setResultImages] = useState<string[]>([]);')
    code = code.replace('setResultImage(null);', 'setResultImages([]);')
    code = code.replace('let lastImageUrl: string | null = null;', 'let lastImageUrls: string[] = [];')
    
    code = code.replace("if (agent.id === 'designer' && data.result.imageUrl) {", "if (agent.id === 'designer' && data.result.imageUrls) {")
    code = code.replace("setResultImage(data.result.imageUrl);", "setResultImages(data.result.imageUrls);")
    code = code.replace("lastImageUrl = data.result.imageUrl;", "lastImageUrls = data.result.imageUrls;")

    code = code.replace('if (lastImageUrl) {', 'if (lastImageUrls.length > 0) {')
    code = code.replace('image_url: lastImageUrl,', 'image_urls: lastImageUrls,')
    
    code = code.replace("const previewImages = activeTab === 'history' \n    ? history.map(h => h.image_url)\n    : resultImage ? [resultImage] : [];", "const previewImages = activeTab === 'history' \n    ? history.map(h => h.image_urls?.[0] || '')\n    : resultImages.length > 0 ? resultImages : [];")
    
    code = code.replace('!isProcessing && !resultImage', '!isProcessing && resultImages.length === 0')
    code = code.replace('resultImage && !isProcessing', 'resultImages.length > 0 && !isProcessing')
    
    display_map = """
                      <div className="flex overflow-x-auto snap-x space-x-4 p-4 w-full">
                        {resultImages.map((img, idx) => (
                          <img key={idx} src={img} alt={`Final Slide ${idx + 1}`} className="w-3/4 max-w-sm h-auto snap-center rounded-[24px] shadow-sm ring-1 ring-background" />
                        ))}
                      </div>
  """
    code = code.replace('<img src={resultImage} alt="Final Flyer" className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]" />', display_map)
    code = code.replace("onClick={() => handleDownload(resultImage, `carousel-${project?.name || 'design'}.png`)}", "onClick={() => { resultImages.forEach((img, idx) => handleDownload(img, `carousel-${project?.name || 'design'}-${idx+1}.png`)); }}")
    code = code.replace('onClick={() => setResultImage(null)}', 'onClick={() => setResultImages([])}')
    code = code.replace('setResultImage(null)', 'setResultImages([])')
    code = code.replace('src={flyer.image_url}', 'src={flyer.image_urls?.[0]}')
    code = code.replace("handleDownload(flyer.image_url, `carousel-${flyer.id}.png`)", "flyer.image_urls?.forEach((u: string, i: number) => handleDownload(u, `carousel-${flyer.id}-${i+1}.png`))")
    
    code = code.replace('setResultImage(null);', 'setResultImages([]);')
    code = code.replace('setResultImage(null)', 'setResultImages([])')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Replaced CarouselSquadView.tsx content successfully.")
