import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Plus,
  Trash2,
  Download,
  Upload,
  Check,
  AlertCircle,
  Package,
} from 'lucide-react';

export type GameThemeType = 'itto' | 'wavelength' | 'cah';

export interface CustomThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameType: GameThemeType;
  existingCustomCount?: number;
  onSaveThemes: (payload: { type: string; [key: string]: any }) => void;
}

// Preset Packs para cada jogo
const ITTO_PRESETS = [
  {
    id: 'geek_pop',
    title: 'Geek & Cultura Pop 🎮',
    desc: 'Superpoderes, heróis, vilões da ficção e games marcantes.',
    themes: [
      {
        title: 'Superpoder do mais inútil ao mais apelão',
        min_label: 'Falar com algas marinhas',
        max_label: 'Manipular a realidade e o tempo',
        category: 'Geek',
      },
      {
        title: 'Personagens do mais puro de coração ao mais psicopata',
        min_label: 'Bob Esponja / Winnie the Pooh',
        max_label: 'Coringa / Thanos',
        category: 'Geek',
      },
      {
        title: 'Jogos do mais relaxante ao mais frustrante',
        min_label: 'Animal Crossing / Stardew Valley',
        max_label: 'Dark Souls / Flappy Bird',
        category: 'Games',
      },
      {
        title: 'Vilões de cinema do mais perdoável ao mais imperdoável',
        min_label: 'Gru (Meu Malvado Favorito)',
        max_label: 'Voldemort / Sauron',
        category: 'Cinema',
      },
      {
        title: 'Filmes do mais tranquilo ao mais constrangedor de ver com a família',
        min_label: 'O Rei Leão / Toy Story',
        max_label: '50 Tons de Cinza',
        category: 'Cinema',
      },
    ],
  },
  {
    id: 'cotidiano_caos',
    title: 'Cotidiano & Caos Brasileiro 🇧🇷',
    desc: 'Situações embaraçosas, perrengues urbanos e comidas de festa.',
    themes: [
      {
        title: 'Situações do dia a dia da menos à mais constrangedora',
        min_label: 'Tropeçar na calçada vazia',
        max_label: 'Chamar a sogra de "amor" por engano no almoço',
        category: 'Cotidiano',
      },
      {
        title: 'Nível de preguiça humana',
        min_label: 'Acordar 5h no sábado pra correr 10km',
        max_label: 'Usar o dedão do pé pra alcançar o controle remoto',
        category: 'Humor',
      },
      {
        title: 'Comidas de festa de aniversário da pior à melhor',
        min_label: 'Uva passa com maionese morna',
        max_label: 'Cento de coxinha quentinha recém frita',
        category: 'Comida',
      },
      {
        title: 'Perrengues no transporte público do mais suave ao insuportável',
        min_label: 'Ter que ficar em pé por 2 paradas',
        max_label: 'Metrô lotado no calor de 40°C sem ar condicionado',
        category: 'Cotidiano',
      },
    ],
  },
  {
    id: 'debates_absurdos',
    title: 'Debates & Dilemas Absurdos 🧠',
    desc: 'Invenções bizarras, brigas impossíveis e escolhas extremas.',
    themes: [
      {
        title: 'Invenções da humanidade da mais inútil à mais revolucionária',
        min_label: 'Garfo giratório de comer macarrão',
        max_label: 'A descoberta da eletricidade e dos antibióticos',
        category: 'Filosofia',
      },
      {
        title: 'Animais que venceriam numa arena de combate',
        min_label: 'Hamster com sono',
        max_label: 'Tiranossauro Rex com armadura de nanotecnologia',
        category: 'Debate',
      },
      {
        title: 'Nível de coragem necessário',
        min_label: 'Matar uma baratinha de casca mole',
        max_label: 'Entrar numa caverna escura ouvindo um rosnado misterioso',
        category: 'Coragem',
      },
    ],
  },
];

const WAVELENGTH_PRESETS = [
  {
    id: 'pop_cinema',
    title: 'Cultura Pop & Cinema 🎬',
    desc: 'Filmes, séries, músicas e personagens sob o olhar do espectro.',
    themes: [
      { left: 'Filme Ruim', right: 'Obra-Prima do Cinema', category: 'Cinema' },
      { left: 'Franquia Esquecível', right: 'Franquia Lendária', category: 'Cinema' },
      { left: 'Personagem Irritante', right: 'Personagem Carismático', category: 'Pop' },
      { left: 'Série Superestimada', right: 'Série Subestimada', category: 'TV' },
      { left: 'Música Grudenta Chata', right: 'Hino Atemporal', category: 'Música' },
      { left: 'Ator Mediano', right: 'Lenda Viva de Hollywood', category: 'Cinema' },
    ],
  },
  {
    id: 'gastronomia',
    title: 'Gastronomia & Comida 🍕',
    desc: 'Sabores, hábitos à mesa e debates culinários clássicos.',
    themes: [
      { left: 'Comida Intragável', right: 'Banquete dos Deuses', category: 'Comida' },
      { left: 'Muito Saudável e Sem Sabor', right: 'Bomba Calórica Irresistível', category: 'Comida' },
      { left: 'Sobremesa Decepcionante', right: 'Melhor Doce do Planeta', category: 'Comida' },
      { left: 'Pizza Tradicional Italiana', right: 'Invenção Maluca Brasileira', category: 'Comida' },
      { left: 'Bebida Ruim', right: 'Néctar Refrescante Supremo', category: 'Bebida' },
      { left: 'Comida de Hospital', right: 'Comida da Vovó', category: 'Comida' },
    ],
  },
  {
    id: 'vida_cotidiano',
    title: 'Vida, Sociedade & Moral ⚖️',
    desc: 'Condutas sociais, compras por impulso e dilemas do dia a dia.',
    themes: [
      { left: 'Hábito Socialmente Inaceitável', right: 'Comportamento Exemplar', category: 'Cotidiano' },
      { left: 'Totalmente Seguro', right: 'Extremamente Perigoso', category: 'Vida' },
      { left: 'Gasto Fútil e Idiota', right: 'Melhor Investimento da Vida', category: 'Finanças' },
      { left: 'Completamente Cafona', right: 'Extremamente Estiloso', category: 'Estilo' },
      { left: 'Mentirinha Inofensiva', right: 'Pecado Capital Imperdoável', category: 'Moral' },
      { left: 'Trabalho Chato e Desgastante', right: 'Emprego dos Sonhos', category: 'Carreira' },
    ],
  },
];

const CAH_PRESETS = [
  {
    id: 'brasil_memes',
    title: 'Brasil & Memes Clássicos 🇧🇷',
    desc: 'Pérolas da TV brasileira, memes históricos e caos nacional.',
    blackCards: [
      { text: 'Hoje no Brasil Urgente: Datena fica furioso com ____.', pick: 1 },
      { text: 'Qual é o verdadeiro segredo para o sucesso do brasileiro? ____.', pick: 1 },
      { text: 'No próximo paredão do BBB, fulano foi eliminado por causa de ____.', pick: 1 },
      { text: 'Comprei no camelô por 10 reais e veio ____.', pick: 1 },
      { text: 'Minha mãe me deu uma bronca porque achou ____ debaixo da minha cama.', pick: 1 },
      { text: 'Para conquistar o crush, nada melhor do que ____ e ____.', pick: 2 },
    ],
    whiteCards: [
      { text: 'O Faustão ligando pra sua casa domingo às 15h' },
      { text: 'Um pastel de feira com 90% de vento e 10% de carne' },
      { text: 'O "Gemidão do WhatsApp" no volume máximo no meio do velório' },
      { text: 'Chorão de skate fazendo manobra no tribunal' },
      { text: 'A fila da lotérica no quinto dia útil do mês' },
      { text: 'O cachorro caramelo latindo ferozmente para o motoqueiro' },
      { text: 'Áudio de 7 minutos da sua tia no grupo da família' },
      { text: 'Caneta azul, azul caneta' },
      { text: 'Comer pizza fria de três dias atrás no café da manhã' },
      { text: 'Uma ligação misteriosa de São Paulo desligando na sua cara' },
    ],
  },
  {
    id: 'tech_devs',
    title: 'Tech, Devs & Startups 💻',
    desc: 'Deploy na sexta-feira, reuniões inúteis e café requentado.',
    blackCards: [
      { text: 'O que causou a queda de produção na sexta-feira às 18h? ____.', pick: 1 },
      { text: 'O cliente jurou que queria algo simples, apenas um site que fizesse ____.', pick: 1 },
      { text: 'No meu currículo eu menti que tinha 5 anos de experiência com ____.', pick: 1 },
      { text: 'A inteligência artificial vai dominar o mundo quando aprender a lidar com ____.', pick: 1 },
      { text: 'Passo 1: ____. Passo 2: ____. Lucro garantido!', pick: 2 },
    ],
    whiteCards: [
      { text: 'Dar git push direto na branch main sem rodar testes' },
      { text: 'Reiniciar o computador e fingir que o problema sumiu' },
      { text: 'Café frio de 3 dias atrás esquecido na garrafa da recepção' },
      { text: 'Um comentário no código: "não apague isso, nem Deus sabe como funciona"' },
      { text: 'Stack Overflow fora do ar em plena sprint de entrega' },
      { text: 'Uma reunião de 2 horas que se resolveria num e-mail de 1 linha' },
      { text: 'O estagiário dropando a tabela de clientes em produção' },
      { text: 'Fazer deploy na sexta-feira 17h59 e desligar o celular' },
      { text: 'Cobrar 50 mil reais pra trocar a cor de um botão' },
      { text: 'Culpar o cache do navegador pelo bug óbvio' },
    ],
  },
];

export const CustomThemeModal: React.FC<CustomThemeModalProps> = ({
  isOpen,
  onClose,
  gameType,
  existingCustomCount = 0,
  onSaveThemes,
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'import' | 'presets'>('manual');
  const [saveMode, setSaveMode] = useState<'append' | 'replace'>('append');

  // Itto state
  const [ittoTitle, setIttoTitle] = useState('');
  const [ittoMin, setIttoMin] = useState('');
  const [ittoMax, setIttoMax] = useState('');
  const [ittoCategory, setIttoCategory] = useState('');
  const [stagedIttoThemes, setStagedIttoThemes] = useState<any[]>([]);

  // Wavelength state
  const [waveLeft, setWaveLeft] = useState('');
  const [waveRight, setWaveRight] = useState('');
  const [waveCategory, setWaveCategory] = useState('');
  const [stagedWaveThemes, setStagedWaveThemes] = useState<any[]>([]);

  // CAH state
  const [cahCardType, setCahCardType] = useState<'black' | 'white'>('black');
  const [cahBlackText, setCahBlackText] = useState('');
  const [cahBlackPick, setCahBlackPick] = useState(1);
  const [cahWhiteText, setCahWhiteText] = useState('');
  const [stagedCahBlack, setStagedCahBlack] = useState<any[]>([]);
  const [stagedCahWhite, setStagedCahWhite] = useState<any[]>([]);

  // Import state
  const [importText, setImportText] = useState('');
  const [importFeedback, setImportFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  // Helpers de adição manual
  const handleAddItto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ittoTitle.trim() || !ittoMin.trim() || !ittoMax.trim()) return;
    setStagedIttoThemes((prev) => [
      ...prev,
      {
        title: ittoTitle.trim(),
        min_label: ittoMin.trim(),
        max_label: ittoMax.trim(),
        category: ittoCategory.trim() || 'Geral',
      },
    ]);
    setIttoTitle('');
    setIttoMin('');
    setIttoMax('');
  };

  const handleAddWave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waveLeft.trim() || !waveRight.trim()) return;
    setStagedWaveThemes((prev) => [
      ...prev,
      {
        left: waveLeft.trim(),
        right: waveRight.trim(),
        category: waveCategory.trim() || 'Geral',
      },
    ]);
    setWaveLeft('');
    setWaveRight('');
  };

  const handleAddCah = (e: React.FormEvent) => {
    e.preventDefault();
    if (cahCardType === 'black') {
      if (!cahBlackText.trim()) return;
      const count = (cahBlackText.match(/____|___/g) || []).length;
      const pick = count > 1 ? count : Math.max(1, cahBlackPick);
      setStagedCahBlack((prev) => [...prev, { text: cahBlackText.trim(), pick }]);
      setCahBlackText('');
      setCahBlackPick(1);
    } else {
      if (!cahWhiteText.trim()) return;
      setStagedCahWhite((prev) => [...prev, { text: cahWhiteText.trim() }]);
      setCahWhiteText('');
    }
  };

  // Carregar preset pack
  const handleLoadPreset = (preset: any) => {
    if (gameType === 'itto') {
      setStagedIttoThemes((prev) => [...prev, ...preset.themes]);
    } else if (gameType === 'wavelength') {
      setStagedWaveThemes((prev) => [...prev, ...preset.themes]);
    } else if (gameType === 'cah') {
      setStagedCahBlack((prev) => [...prev, ...preset.blackCards]);
      setStagedCahWhite((prev) => [...prev, ...preset.whiteCards]);
    }
    setImportFeedback({ msg: `Pack "${preset.title}" carregado com sucesso!`, type: 'success' });
  };

  // Inserir modelo de exemplo no import
  const handleInsertTemplate = () => {
    if (gameType === 'itto') {
      const template = [
        {
          title: 'Animais mais perigosos',
          min_label: 'Borboletinha mansa',
          max_label: 'Tubarão megalodonte faminto',
          category: 'Natureza',
        },
        {
          title: 'Nível de coragem para a situação',
          min_label: 'Pedir informação na rua',
          max_label: 'Encarar um fantasma no escuro',
          category: 'Cotidiano',
        },
      ];
      setImportText(JSON.stringify(template, null, 2));
    } else if (gameType === 'wavelength') {
      const template = [
        { left: 'Comida Ruim', right: 'Comida Deliciosa', category: 'Culinária' },
        { left: 'Muito Barato', right: 'Luxo Inacessível', category: 'Finanças' },
      ];
      setImportText(JSON.stringify(template, null, 2));
    } else if (gameType === 'cah') {
      const template = {
        blackCards: [
          { text: 'Por que o servidor caiu? Por causa de ____.', pick: 1 },
          { text: 'Na minha vida só preciso de duas coisas: ____ e ____.', pick: 2 },
        ],
        whiteCards: [
          { text: 'Café requentado às 4h da manhã' },
          { text: 'O estagiário chorando no banheiro' },
        ],
      };
      setImportText(JSON.stringify(template, null, 2));
    }
  };

  // Processar importação
  const handleProcessImport = () => {
    setImportFeedback(null);
    const trimmed = importText.trim();
    if (!trimmed) {
      setImportFeedback({ msg: 'Cole um texto ou JSON para importar.', type: 'error' });
      return;
    }

    try {
      // Tenta JSON primeiro
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);

        if (gameType === 'itto') {
          const list = Array.isArray(parsed) ? parsed : parsed.themes || [];
          const valid = list.filter((item: any) => item.title && (item.min_label || item.minLabel));
          if (valid.length === 0) throw new Error('Nenhum tema de Itto válido encontrado.');
          const formatted = valid.map((item: any) => ({
            title: item.title,
            min_label: item.min_label || item.minLabel || 'Mínimo',
            max_label: item.max_label || item.maxLabel || 'Máximo',
            category: item.category || 'Personalizado',
          }));
          setStagedIttoThemes((prev) => [...prev, ...formatted]);
          setImportFeedback({ msg: `${formatted.length} tema(s) importado(s) com sucesso!`, type: 'success' });
          setImportText('');
          return;
        }

        if (gameType === 'wavelength') {
          const list = Array.isArray(parsed) ? parsed : parsed.themes || [];
          const valid = list.filter((item: any) => item.left && item.right);
          if (valid.length === 0) throw new Error('Nenhum tema de Wavelength válido encontrado.');
          const formatted = valid.map((item: any) => ({
            left: item.left,
            right: item.right,
            category: item.category || 'Personalizado',
          }));
          setStagedWaveThemes((prev) => [...prev, ...formatted]);
          setImportFeedback({ msg: `${formatted.length} espectro(s) importado(s) com sucesso!`, type: 'success' });
          setImportText('');
          return;
        }

        if (gameType === 'cah') {
          const bList = parsed.blackCards || parsed.black || [];
          const wList = parsed.whiteCards || parsed.white || [];
          let bAdded = 0;
          let wAdded = 0;

          if (Array.isArray(bList)) {
            const formatted = bList
              .map((item: any) => {
                const text = typeof item === 'string' ? item : item.text;
                if (!text) return null;
                const pick = typeof item === 'object' && item.pick ? item.pick : 1;
                return { text, pick };
              })
              .filter(Boolean);
            setStagedCahBlack((prev) => [...prev, ...formatted]);
            bAdded = formatted.length;
          }

          if (Array.isArray(wList)) {
            const formatted = wList
              .map((item: any) => {
                const text = typeof item === 'string' ? item : item.text;
                if (!text) return null;
                return { text };
              })
              .filter(Boolean);
            setStagedCahWhite((prev) => [...prev, ...formatted]);
            wAdded = formatted.length;
          }

          setImportFeedback({
            msg: `${bAdded} carta(s) preta(s) e ${wAdded} branca(s) importadas!`,
            type: 'success',
          });
          setImportText('');
          return;
        }
      }

      // Fallback: Linha por linha em texto plano
      const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);

      if (gameType === 'wavelength') {
        const parsedThemes: any[] = [];
        for (const line of lines) {
          if (line.includes('<->') || line.includes('|')) {
            const separator = line.includes('<->') ? '<->' : '|';
            const parts = line.split(separator).map((s) => s.trim());
            if (parts.length >= 2 && parts[0] && parts[1]) {
              parsedThemes.push({ left: parts[0], right: parts[1], category: 'Personalizado' });
            }
          }
        }
        if (parsedThemes.length > 0) {
          setStagedWaveThemes((prev) => [...prev, ...parsedThemes]);
          setImportFeedback({ msg: `${parsedThemes.length} tema(s) importado(s)!`, type: 'success' });
          setImportText('');
          return;
        }
      } else if (gameType === 'itto') {
        const parsedThemes: any[] = [];
        for (const line of lines) {
          if (line.includes('|')) {
            const parts = line.split('|').map((s) => s.trim());
            if (parts.length >= 3) {
              parsedThemes.push({
                title: parts[0],
                min_label: parts[1],
                max_label: parts[2],
                category: parts[3] || 'Personalizado',
              });
            }
          }
        }
        if (parsedThemes.length > 0) {
          setStagedIttoThemes((prev) => [...prev, ...parsedThemes]);
          setImportFeedback({ msg: `${parsedThemes.length} tema(s) importado(s)!`, type: 'success' });
          setImportText('');
          return;
        }
      } else if (gameType === 'cah') {
        const bCards: any[] = [];
        const wCards: any[] = [];
        for (const line of lines) {
          if (line.includes('____') || line.includes('___')) {
            bCards.push({ text: line, pick: (line.match(/____|___/g) || []).length || 1 });
          } else {
            wCards.push({ text: line });
          }
        }
        if (bCards.length > 0 || wCards.length > 0) {
          setStagedCahBlack((prev) => [...prev, ...bCards]);
          setStagedCahWhite((prev) => [...prev, ...wCards]);
          setImportFeedback({
            msg: `${bCards.length} carta(s) preta(s) e ${wCards.length} branca(s) importadas!`,
            type: 'success',
          });
          setImportText('');
          return;
        }
      }

      throw new Error('Formato não reconhecido. Use a opção "Inserir Modelo" para ver a estrutura esperada.');
    } catch (err: any) {
      setImportFeedback({ msg: err.message || 'Erro ao processar dados.', type: 'error' });
    }
  };

  // Exportar dados atuais
  const handleExport = () => {
    let exportData: any = null;
    let filename = 'temas.json';

    if (gameType === 'itto') {
      exportData = stagedIttoThemes;
      filename = 'itto_temas_custom.json';
    } else if (gameType === 'wavelength') {
      exportData = stagedWaveThemes;
      filename = 'wavelength_temas_custom.json';
    } else if (gameType === 'cah') {
      exportData = { blackCards: stagedCahBlack, whiteCards: stagedCahWhite };
      filename = 'cah_cartas_custom.json';
    }

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Salvar e enviar para o WebSocket do servidor
  const handleSaveToRoom = () => {
    if (gameType === 'itto') {
      const type = saveMode === 'replace' ? 'SET_CUSTOM_THEMES' : 'ADD_CUSTOM_THEMES';
      onSaveThemes({ type, themes: stagedIttoThemes });
    } else if (gameType === 'wavelength') {
      const type = saveMode === 'replace' ? 'SET_CUSTOM_THEMES' : 'ADD_CUSTOM_THEMES';
      onSaveThemes({ type, themes: stagedWaveThemes });
    } else if (gameType === 'cah') {
      const type = saveMode === 'replace' ? 'SET_CUSTOM_CARDS' : 'ADD_CUSTOM_CARDS';
      onSaveThemes({ type, blackCards: stagedCahBlack, whiteCards: stagedCahWhite });
    }
    onClose();
  };

  const totalStagedCount =
    gameType === 'itto'
      ? stagedIttoThemes.length
      : gameType === 'wavelength'
      ? stagedWaveThemes.length
      : stagedCahBlack.length + stagedCahWhite.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl max-h-[92dvh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white"
      >
        {/* Header do Modal */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-xl shadow-lg">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-wide uppercase text-white">
                  Temas Personalizados
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                  {gameType.toUpperCase()}
                </span>
                {existingCustomCount > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {existingCustomCount} na sala
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Crie, importe ou escolha packs prontos para a partida da sua sala.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/10 bg-white/[0.02] px-4 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'manual'
                ? 'border-purple-500 text-purple-300 bg-white/5'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Plus size={14} />
            <span>Criar Manual</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'presets'
                ? 'border-purple-500 text-purple-300 bg-white/5'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Package size={14} />
            <span>Packs Prontos</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'import'
                ? 'border-purple-500 text-purple-300 bg-white/5'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Upload size={14} />
            <span>Importar JSON / Texto</span>
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* TAB 1: CRIAR MANUALMENTE */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              {/* Form específico para cada jogo */}
              {gameType === 'itto' && (
                <form onSubmit={handleAddItto} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                    Novo Tema para Itto (1 a 100)
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1 font-semibold">
                      Título do Tema / Pergunta:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Animais mais assustadores"
                      value={ittoTitle}
                      onChange={(e) => setIttoTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-emerald-400 block mb-1 font-semibold">
                        Mínimo (Valor 1):
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Formiga bebê fofa"
                        value={ittoMin}
                        onChange={(e) => setIttoMin(e.target.value)}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-rose-400 block mb-1 font-semibold">
                        Máximo (Valor 100):
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Tubarão branco faminto"
                        value={ittoMax}
                        onChange={(e) => setIttoMax(e.target.value)}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <input
                      type="text"
                      placeholder="Categoria (opcional, ex: Geek, Cinema)"
                      value={ittoCategory}
                      onChange={(e) => setIttoCategory(e.target.value)}
                      className="w-1/2 px-3 py-1.5 bg-black/30 border border-white/10 rounded-xl text-xs text-gray-300 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!ittoTitle.trim() || !ittoMin.trim() || !ittoMax.trim()}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      + Adicionar à Lista
                    </button>
                  </div>
                </form>
              )}

              {gameType === 'wavelength' && (
                <form onSubmit={handleAddWave} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    Novo Espectro para Wavelength (0% a 100%)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-cyan-400 block mb-1 font-semibold">
                        Extremo Esquerdo (0%):
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Filme Ruim"
                        value={waveLeft}
                        onChange={(e) => setWaveLeft(e.target.value)}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-indigo-400 block mb-1 font-semibold">
                        Extremo Direito (100%):
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Obra-Prima do Cinema"
                        value={waveRight}
                        onChange={(e) => setWaveRight(e.target.value)}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <input
                      type="text"
                      placeholder="Categoria (opcional, ex: Pop, Comida)"
                      value={waveCategory}
                      onChange={(e) => setWaveCategory(e.target.value)}
                      className="w-1/2 px-3 py-1.5 bg-black/30 border border-white/10 rounded-xl text-xs text-gray-300 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!waveLeft.trim() || !waveRight.trim()}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      + Adicionar à Lista
                    </button>
                  </div>
                </form>
              )}

              {gameType === 'cah' && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Criar Carta para Cards Against Humanity
                    </div>
                    <div className="flex gap-1 bg-black/40 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setCahCardType('black')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                          cahCardType === 'black'
                            ? 'bg-zinc-800 text-white shadow'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        ⬛ Carta Preta (Pergunta)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCahCardType('white')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                          cahCardType === 'white'
                            ? 'bg-white text-black shadow'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        ⬜ Carta Branca (Resposta)
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleAddCah} className="space-y-3">
                    {cahCardType === 'black' ? (
                      <>
                        <div>
                          <label className="text-[11px] text-gray-400 block mb-1 font-semibold">
                            Texto da Carta Preta (use <code className="text-amber-400 font-mono">____</code> para os
                            espaços em branco):
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Ex: Hoje o chefe cancelou a reunião por causa de ____."
                            value={cahBlackText}
                            onChange={(e) => setCahBlackText(e.target.value)}
                            className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400 text-[11px]">
                            Quantidade de respostas exigidas (Pick):
                          </span>
                          <div className="flex gap-1">
                            {[1, 2, 3].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setCahBlackPick(num)}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition ${
                                  cahBlackPick === num
                                    ? 'bg-amber-400 text-black'
                                    : 'bg-black/40 text-gray-400'
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="text-[11px] text-gray-400 block mb-1 font-semibold">
                          Texto da Carta Branca (Resposta absurda ou cômica):
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Um pastel com 90% de vento e 10% de carne"
                          value={cahWhiteText}
                          onChange={(e) => setCahWhiteText(e.target.value)}
                          className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-white"
                        />
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={
                          cahCardType === 'black' ? !cahBlackText.trim() : !cahWhiteText.trim()
                        }
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-black text-xs uppercase rounded-xl transition cursor-pointer"
                      >
                        + Adicionar à Lista
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Lista de itens staged */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                  <span>Itens Prontos para Adicionar ({totalStagedCount})</span>
                  {totalStagedCount > 0 && (
                    <button
                      onClick={() => {
                        setStagedIttoThemes([]);
                        setStagedWaveThemes([]);
                        setStagedCahBlack([]);
                        setStagedCahWhite([]);
                      }}
                      className="text-rose-400 hover:text-rose-300 text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12} /> Limpar lista
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {gameType === 'itto' && stagedIttoThemes.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1 truncate pr-2">
                        <div className="font-bold text-white truncate">{item.title}</div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-2">
                          <span className="text-emerald-400">1: {item.min_label}</span>
                          <span>&bull;</span>
                          <span className="text-rose-400">100: {item.max_label}</span>
                          {item.category && <span className="text-purple-300 font-mono">[{item.category}]</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => setStagedIttoThemes((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-gray-500 hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {gameType === 'wavelength' && stagedWaveThemes.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 font-bold truncate pr-2">
                        <span className="text-cyan-400 truncate">{item.left}</span>
                        <span className="text-gray-500">&larr; &rarr;</span>
                        <span className="text-indigo-300 truncate">{item.right}</span>
                        {item.category && <span className="text-gray-500 text-[10px] font-mono">[{item.category}]</span>}
                      </div>
                      <button
                        onClick={() => setStagedWaveThemes((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-gray-500 hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {gameType === 'cah' && (
                    <>
                      {stagedCahBlack.map((item, idx) => (
                        <div
                          key={`b_${idx}`}
                          className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div className="truncate pr-2">
                            <span className="font-bold text-white truncate">{item.text}</span>
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono">
                              Pick: {item.pick}
                            </span>
                          </div>
                          <button
                            onClick={() => setStagedCahBlack((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-gray-500 hover:text-rose-400 p-1 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {stagedCahWhite.map((item, idx) => (
                        <div
                          key={`w_${idx}`}
                          className="p-3 bg-white/10 border border-white/20 rounded-xl flex items-center justify-between text-xs text-white"
                        >
                          <span className="truncate pr-2 font-medium">{item.text}</span>
                          <button
                            onClick={() => setStagedCahWhite((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-gray-400 hover:text-rose-400 p-1 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </>
                  )}

                  {totalStagedCount === 0 && (
                    <div className="text-center py-6 text-gray-500 text-xs italic bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                      Nenhum item adicionado ainda. Preencha o formulário acima ou selecione um Pack Pronto.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PACKS PRONTOS */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                Adicione coleções temáticas testadas com 1 clique para enriquecer a partida imediatamente:
              </p>

              <div className="grid grid-cols-1 gap-3">
                {gameType === 'itto' && ITTO_PRESETS.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-sm text-purple-300">{p.title}</div>
                      <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
                      <div className="text-[10px] text-purple-400/80 font-mono mt-1">
                        {p.themes.length} temas inclusos
                      </div>
                    </div>
                    <button
                      onClick={() => handleLoadPreset(p)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shrink-0 transition cursor-pointer"
                    >
                      + Carregar Pack
                    </button>
                  </div>
                ))}

                {gameType === 'wavelength' && WAVELENGTH_PRESETS.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-sm text-cyan-300">{p.title}</div>
                      <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
                      <div className="text-[10px] text-cyan-400/80 font-mono mt-1">
                        {p.themes.length} espectros inclusos
                      </div>
                    </div>
                    <button
                      onClick={() => handleLoadPreset(p)}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shrink-0 transition cursor-pointer"
                    >
                      + Carregar Pack
                    </button>
                  </div>
                ))}

                {gameType === 'cah' && CAH_PRESETS.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-sm text-amber-300">{p.title}</div>
                      <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
                      <div className="text-[10px] text-amber-400/80 font-mono mt-1">
                        {p.blackCards.length} pretas &bull; {p.whiteCards.length} brancas
                      </div>
                    </div>
                    <button
                      onClick={() => handleLoadPreset(p)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase rounded-xl shrink-0 transition cursor-pointer"
                    >
                      + Carregar Pack
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: IMPORTAR JSON / TEXTO */}
          {activeTab === 'import' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Cole seu JSON ou texto com linhas personalizadas:</span>
                <button
                  type="button"
                  onClick={handleInsertTemplate}
                  className="text-purple-400 hover:text-purple-300 font-bold cursor-pointer text-[11px]"
                >
                  Inserir Modelo Exemplo
                </button>
              </div>

              <textarea
                rows={8}
                placeholder="Cole JSON ou linhas no formato de texto..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full p-3 bg-black/60 border border-white/10 rounded-2xl text-xs font-mono text-gray-200 focus:outline-none focus:border-purple-500 custom-scrollbar"
              />

              {importFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    importFeedback.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {importFeedback.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                  <span>{importFeedback.msg}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={totalStagedCount === 0}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download size={14} /> Exportar JSON
                </button>

                <button
                  type="button"
                  onClick={handleProcessImport}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                >
                  Validar e Adicionar à Lista
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer do Modal com Salvar */}
        <div className="px-5 py-4 border-t border-white/10 bg-black/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Modo de envio:</span>
            <select
              value={saveMode}
              onChange={(e) => setSaveMode(e.target.value as any)}
              className="bg-black/60 border border-white/10 text-white text-xs rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="append">Somar aos temas da sala</option>
              <option value="replace">Substituir todos os temas</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              onClick={handleSaveToRoom}
              disabled={totalStagedCount === 0}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 disabled:opacity-40 text-white text-xs font-black uppercase tracking-wider shadow-lg transition cursor-pointer"
            >
              Salvar na Sala ({totalStagedCount}) ✨
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
