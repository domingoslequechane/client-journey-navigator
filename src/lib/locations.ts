export interface City {
  name: string;
  code: string;
}

export const CITIES_BY_COUNTRY: Record<string, City[]> = {
  MZ: [
    { name: 'Maputo', code: 'MAPUTO' },
    { name: 'Matola', code: 'MATOLA' },
    { name: 'Beira', code: 'BEIRA' },
    { name: 'Nampula', code: 'NAMPULA' },
    { name: 'Quelimane', code: 'QUELIMANE' },
    { name: 'Tete', code: 'TETE' },
    { name: 'Xai-Xai', code: 'XAI-XAI' },
    { name: 'Maxixe', code: 'MAXIXE' },
    { name: 'Inhambane', code: 'INHAMBANE' },
    { name: 'Pemba', code: 'PEMBA' },
    { name: 'Lichinga', code: 'LICHINGA' },
    { name: 'Chimoio', code: 'CHIMOIO' },
  ],
  BR: [
    { name: 'São Paulo', code: 'SAO_PAULO' },
    { name: 'Rio de Janeiro', code: 'RIO_DE_JANEIRO' },
    { name: 'Belo Horizonte', code: 'BELO_HORIZONTE' },
    { name: 'Brasília', code: 'BRASILIA' },
    { name: 'Salvador', code: 'SALVADOR' },
    { name: 'Fortaleza', code: 'FORTALEZA' },
    { name: 'Curitiba', code: 'CURITIBA' },
    { name: 'Manaus', code: 'MANAUS' },
    { name: 'Recife', code: 'RECIFE' },
    { name: 'Porto Alegre', code: 'PORTO_ALEGRE' },
  ],
  PT: [
    { name: 'Lisboa', code: 'LISBOA' },
    { name: 'Porto', code: 'PORTO' },
    { name: 'Vila Nova de Gaia', code: 'VILA_NOVA_DE_GAIA' },
    { name: 'Amadora', code: 'AMADORA' },
    { name: 'Braga', code: 'BRAGA' },
    { name: 'Funchal', code: 'FUNCHAL' },
    { name: 'Coimbra', code: 'COIMBRA' },
    { name: 'Setúbal', code: 'SETUBAL' },
    { name: 'Aveiro', code: 'AVEIRO' },
    { name: 'Faro', code: 'FARO' },
  ],
  AO: [
    { name: 'Luanda', code: 'LUANDA' },
    { name: 'Benguela', code: 'BENGUELA' },
    { name: 'Huambo', code: 'HUAMBO' },
    { name: 'Lubango', code: 'LUBANGO' },
    { name: 'Kuito', code: 'KUITO' },
    { name: 'Malanje', code: 'MALANJE' },
    { name: 'Cabinda', code: 'CABINDA' },
  ],
  US: [
    { name: 'New York', code: 'NEW_YORK' },
    { name: 'Los Angeles', code: 'LOS_ANGELES' },
    { name: 'Chicago', code: 'CHICAGO' },
    { name: 'Miami', code: 'MIAMI' },
    { name: 'San Francisco', code: 'SAN_FRANCISCO' },
  ],
  CV: [
    { name: 'Praia', code: 'PRAIA' },
    { name: 'Mindelo', code: 'MINDELO' },
    { name: 'Espargos', code: 'ESPARGOS' },
  ],
  GW: [
    { name: 'Bissau', code: 'BISSAU' },
    { name: 'Bafatá', code: 'BAFATA' },
  ],
  ST: [
    { name: 'São Tomé', code: 'SAO_TOME' },
    { name: 'Trindade', code: 'TRINDADE' },
  ],
  ZA: [
    { name: 'Johannesburg', code: 'JOHANNESBURG' },
    { name: 'Cape Town', code: 'CAPE_TOWN' },
    { name: 'Durban', code: 'DURBAN' },
    { name: 'Pretoria', code: 'PRETORIA' },
  ],
};
