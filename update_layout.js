const fs = require('fs');

let content = fs.readFileSync('src/components/studio/ProjectForm.tsx', 'utf-8');

// The outer wrap currently starts with:
// <div className="grid md:grid-cols-2 gap-6">
// And ends at the last </Card> + </div> before <Dialog

// We will use regex to capture each card.
const extractCard = (startStr, endStr) => {
    const startIdx = content.indexOf(startStr);
    if (startIdx === -1) throw new Error("Could not find: " + startStr);
    
    // Find matching </Card>
    let temp = content.substring(startIdx);
    const endCardIdx = temp.indexOf('</Card>') + '</Card>'.length;
    const cardContent = temp.substring(0, endCardIdx);
    
    // Remove from original
    content = content.replace(cardContent, '');
    return cardContent;
};

// 1. Capture Header
const headerStart = `<div className="grid md:grid-cols-2 gap-6">`;
content = content.replace(headerStart, `<div className="flex flex-col gap-6">\n      <div className="grid lg:grid-cols-3 gap-6">`);

// 2. Client Card (already in place in content, but let's wrap it in column 1)
const clientCardStart = `{/* Client Selection + Basic Info */}`;
content = content.replace(clientCardStart, `{/* Coluna 1 */}\n        <div className="space-y-6">\n        {/* Client Selection + Basic Info */}`);

// We need to close Column 1 after Client Card.
const clientCardEndStr = `</Card>`; // Note: The first </Card> after clientCardStart
const firstCardIdx = content.indexOf(clientCardEndStr, content.indexOf(clientCardStart)) + clientCardEndStr.length;
content = content.substring(0, firstCardIdx) + `\n        </div> {/* Fim Coluna 1 */}\n` + content.substring(firstCardIdx);

// Now capture all the other cards and place them.
const brandColorsCard = extractCard(`{/* Brand Colors & Font */}`, `</Card>`);
const logoCard = extractCard(`{/* Logo Images */}`, `</Card>`);
const refImagesCard = extractCard(`{/* Reference Images */}`, `</Card>`);
const templateLayoutCard = extractCard(`{/* Template / Approved Layout */}`, `</Card>`);
const inspirationCard = extractCard(`{/* Templates de Inspiração */}`, `</Card>`);
const aiInstructionsCard = extractCard(`{/* AI Instructions */}`, `</Card>`);

// Merge Brand Colors & Logo Images into one Card
const mergedIdentityCard = brandColorsCard
    .replace('<CardTitle>Identidade Visual</CardTitle>', '<CardTitle>Identidade Visual & Logotipos</CardTitle>')
    .replace('<CardDescription>Cores e tipografia da marca</CardDescription>', '<CardDescription>Cores, tipografia e logotipos</CardDescription>')
    .replace('</CardContent>\n        </Card>', `
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Logotipos da Marca</Label>
                <ImageUploader
                  label=""
                  images={formData.logo_images}
                  onImagesChange={(v) => updateField('logo_images', v)}
                  maxImages={5}
                />
              </div>
            </div>
          </CardContent>
        </Card>`);

// We want to reconstruct:
// Col 2: Identity Card + Template Layout Card
// Col 3: AI Instructions Card
// Row 2: Reference Images Card
// Row 3: Inspiration Templates Card
const newLayoutElements = `
        {/* Coluna 2 */}
        <div className="space-y-6">
  ${mergedIdentityCard}
  
  ${templateLayoutCard}
        </div> {/* Fim Coluna 2 */}

        {/* Coluna 3 */}
        <div className="space-y-6">
  ${aiInstructionsCard}
        </div> {/* Fim Coluna 3 */}
      </div> {/* Fim Linha 1 */}

      {/* Linha 2 */}
  ${refImagesCard.replace('className="md:col-span-2"', '')}

      {/* Linha 3 */}
  ${inspirationCard.replace('className="md:col-span-2 border-primary/20 bg-gradient-to-br from-background to-primary/5"', 'className="border-primary/20 bg-gradient-to-br from-background to-primary/5"')}
`;

// Insert the new elements right after `</div> {/* Fim Coluna 1 */}`
const insertPos = content.indexOf(`</div> {/* Fim Coluna 1 */}`) + `</div> {/* Fim Coluna 1 */}`.length;
content = content.substring(0, insertPos) + newLayoutElements + content.substring(insertPos);

fs.writeFileSync('src/components/studio/ProjectForm.tsx', content, 'utf-8');
console.log("ProjectForm.tsx written successfully.");
