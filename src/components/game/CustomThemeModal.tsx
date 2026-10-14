import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  X,
  Plus,
  Trash2,
  Download,
  Upload,
  Check,
  AlertCircle,
  Package,
  Sparkles,
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
    title: 'Geek & Cultura Pop',
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
    title: 'Debates & Dilemas Absurdos',
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
    title: 'Cultura Pop & Cinema',
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
    title: 'Gastronomia & Comida',
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
    title: 'Vida, Sociedade & Moral',
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
    title: 'Tech, Devs & Startups',
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
  const { t } = useTranslation();
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
    setImportFeedback({ msg: t('custom.pack_loaded', { title: preset.title }), type: 'success' });
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
      setImportFeedback({ msg: t('custom.paste_first'), type: 'error' });
      return;
    }

    try {
      // Tenta JSON primeiro
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);

        if (gameType === 'itto') {
          const list = Array.isArray(parsed) ? parsed : parsed.themes || [];
          const valid = list.filter((item: any) => item.title && (item.min_label || item.minLabel));
          if (valid.length === 0) throw new Error(t('custom.no_valid_itto'));
          const formatted = valid.map((item: any) => ({
            title: item.title,
            min_label: item.min_label || item.minLabel || 'Mínimo',
            max_label: item.max_label || item.maxLabel || 'Máximo',
            category: item.category || 'Personalizado',
          }));
          setStagedIttoThemes((prev) => [...prev, ...formatted]);
          setImportFeedback({ msg: t('custom.imported_themes', { count: formatted.length }), type: 'success' });
          setImportText('');
          return;
        }

        if (gameType === 'wavelength') {
          const list = Array.isArray(parsed) ? parsed : parsed.themes || [];
          const valid = list.filter((item: any) => item.left && item.right);
          if (valid.length === 0) throw new Error(t('custom.no_valid_wave'));
          const formatted = valid.map((item: any) => ({
            left: item.left,
            right: item.right,
            category: item.category || 'Personalizado',
          }));
          setStagedWaveThemes((prev) => [...prev, ...formatted]);
          setImportFeedback({ msg: t('custom.imported_spectra', { count: formatted.length }), type: 'success' });
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
            msg: t('custom.imported_cards', { black: bAdded, white: wAdded }),
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
          setImportFeedback({ msg: t('custom.imported_themes', { count: parsedThemes.length }), type: 'success' });
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
          setImportFeedback({ msg: t('custom.imported_themes', { count: parsedThemes.length }), type: 'success' });
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
            msg: t('custom.imported_cards', { black: bCards.length, white: wCards.length }),
            type: 'success',
          });
          setImportText('');
          return;
        }
      }

      throw new Error(t('custom.unknown_format'));
    } catch (err: any) {
      setImportFeedback({ msg: err.message || t('custom.process_error'), type: 'error' });
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

  const tabs = [
    { id: 'manual' as const, label: t('custom.tab_manual'), icon: <Plus size={16} /> },
    { id: 'presets' as const, label: t('custom.tab_presets'), icon: <Package size={16} /> },
    { id: 'import' as const, label: t('custom.tab_import'), icon: <Upload size={16} /> },
  ];

  const presetList: any[] = gameType === 'itto' ? ITTO_PRESETS : gameType === 'wavelength' ? WAVELENGTH_PRESETS : CAH_PRESETS;
  const presetCount = (p: any) =>
    gameType === 'itto'
      ? t('custom.themes_count', { count: p.themes.length })
      : gameType === 'wavelength'
      ? t('custom.spectra_count', { count: p.themes.length })
      : t('custom.cards_count', { black: p.blackCards.length, white: p.whiteCards.length });

  const clearAll = () => {
    setStagedIttoThemes([]);
    setStagedWaveThemes([]);
    setStagedCahBlack([]);
    setStagedCahWhite([]);
  };

  const removeBtn = (onClick: () => void) => (
    <button type="button" onClick={onClick} className="icon-btn border-transparent text-muted hover:text-rose-300" aria-label={t('custom.remove')}>
      <Trash2 size={16} />
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-modal-title"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.25 }}
        className="w-full sm:max-w-2xl max-h-[94dvh] bg-surface border border-line-strong rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-body select-text"
      >
        <div className="px-5 py-4 border-b border-line flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-11 h-11 rounded-2xl bg-accent-soft text-accent flex items-center justify-center shrink-0" aria-hidden="true">
              <Sparkles size={22} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="custom-modal-title" className="font-display font-bold text-xl text-ink">
                  {gameType === 'cah' ? t('custom.title_cards') : t('custom.title_themes')}
                </h2>
                {existingCustomCount > 0 && <span className="chip chip-success">{t('custom.in_room', { count: existingCustomCount })}</span>}
              </div>
              <p className="text-sm text-muted mt-0.5">{t('custom.subtitle')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="icon-btn border-transparent" aria-label={t('game.close')}>
            <X size={20} />
          </button>
        </div>

        <div role="tablist" className="flex border-b border-line px-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-12 px-4 flex items-center gap-2 text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === tab.id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-body'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'manual' && (
            <div className="space-y-4">
              {gameType === 'itto' && (
                <form onSubmit={handleAddItto} className="p-4 rounded-2xl bg-ground border border-line space-y-3">
                  <h3 className="label-caps">{t('custom.itto_new')}</h3>
                  <div className="space-y-1.5">
                    <label htmlFor="itto-title" className="text-sm font-semibold text-ink">{t('custom.itto_title_label')}</label>
                    <input id="itto-title" type="text" placeholder={t('custom.itto_title_ph')} value={ittoTitle} onChange={(e) => setIttoTitle(e.target.value)} className="field" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="itto-min" className="text-sm font-semibold text-ink">{t('custom.itto_min')}</label>
                      <input id="itto-min" type="text" placeholder={t('custom.itto_min_ph')} value={ittoMin} onChange={(e) => setIttoMin(e.target.value)} className="field" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="itto-max" className="text-sm font-semibold text-ink">{t('custom.itto_max')}</label>
                      <input id="itto-max" type="text" placeholder={t('custom.itto_max_ph')} value={ittoMax} onChange={(e) => setIttoMax(e.target.value)} className="field" />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="space-y-1.5 flex-1">
                      <label htmlFor="itto-cat" className="text-sm font-semibold text-ink">{t('custom.category')}</label>
                      <input id="itto-cat" type="text" placeholder={t('custom.category_ph')} value={ittoCategory} onChange={(e) => setIttoCategory(e.target.value)} className="field" />
                    </div>
                    <button type="submit" disabled={!ittoTitle.trim() || !ittoMin.trim() || !ittoMax.trim()} className="btn btn-primary">
                      <Plus size={18} />
                      {t('custom.add')}
                    </button>
                  </div>
                </form>
              )}

              {gameType === 'wavelength' && (
                <form onSubmit={handleAddWave} className="p-4 rounded-2xl bg-ground border border-line space-y-3">
                  <h3 className="label-caps">{t('custom.wave_new')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="wave-left" className="text-sm font-semibold text-ink">{t('custom.wave_left')}</label>
                      <input id="wave-left" type="text" placeholder={t('custom.wave_left_ph')} value={waveLeft} onChange={(e) => setWaveLeft(e.target.value)} className="field" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="wave-right" className="text-sm font-semibold text-ink">{t('custom.wave_right')}</label>
                      <input id="wave-right" type="text" placeholder={t('custom.wave_right_ph')} value={waveRight} onChange={(e) => setWaveRight(e.target.value)} className="field" />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="space-y-1.5 flex-1">
                      <label htmlFor="wave-cat" className="text-sm font-semibold text-ink">{t('custom.category')}</label>
                      <input id="wave-cat" type="text" placeholder={t('custom.category_ph')} value={waveCategory} onChange={(e) => setWaveCategory(e.target.value)} className="field" />
                    </div>
                    <button type="submit" disabled={!waveLeft.trim() || !waveRight.trim()} className="btn btn-primary">
                      <Plus size={18} />
                      {t('custom.add')}
                    </button>
                  </div>
                </form>
              )}

              {gameType === 'cah' && (
                <form onSubmit={handleAddCah} className="p-4 rounded-2xl bg-ground border border-line space-y-3">
                  <div role="radiogroup" aria-label={t('custom.cah_new')} className="grid grid-cols-2 gap-2">
                    {(['black', 'white'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={cahCardType === type}
                        onClick={() => setCahCardType(type)}
                        className={`btn btn-sm ${cahCardType === type ? 'btn-primary' : 'btn-secondary'}`}
                      >
                        <span className={`w-3 h-3 rounded-sm border ${type === 'black' ? 'bg-black border-white/50' : 'bg-white border-zinc-400'}`} aria-hidden="true" />
                        {type === 'black' ? t('custom.cah_black') : t('custom.cah_white')}
                      </button>
                    ))}
                  </div>

                  {cahCardType === 'black' ? (
                    <>
                      <div className="space-y-1.5">
                        <label htmlFor="cah-black" className="text-sm font-semibold text-ink">{t('custom.cah_black_label')}</label>
                        <textarea
                          id="cah-black"
                          rows={2}
                          placeholder={t('custom.cah_black_ph')}
                          value={cahBlackText}
                          onChange={(e) => setCahBlackText(e.target.value)}
                          className="field py-2.5 min-h-20"
                        />
                      </div>
                      <fieldset className="flex items-center justify-between gap-3">
                        <legend className="sr-only">{t('custom.cah_pick')}</legend>
                        <span className="text-sm text-body">{t('custom.cah_pick')}</span>
                        <div className="flex gap-2">
                          {[1, 2, 3].map((num) => (
                            <button
                              key={num}
                              type="button"
                              aria-pressed={cahBlackPick === num}
                              onClick={() => setCahBlackPick(num)}
                              className={`w-11 h-11 rounded-xl font-bold cursor-pointer ${cahBlackPick === num ? 'bg-accent text-accent-ink' : 'bg-raised text-body'}`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    </>
                  ) : (
                    <div className="space-y-1.5">
                      <label htmlFor="cah-white" className="text-sm font-semibold text-ink">{t('custom.cah_white_label')}</label>
                      <input id="cah-white" type="text" placeholder={t('custom.cah_white_ph')} value={cahWhiteText} onChange={(e) => setCahWhiteText(e.target.value)} className="field" />
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button type="submit" disabled={cahCardType === 'black' ? !cahBlackText.trim() : !cahWhiteText.trim()} className="btn btn-primary">
                      <Plus size={18} />
                      {t('custom.add')}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="label-caps">{t('custom.staged', { count: totalStagedCount })}</span>
                  {totalStagedCount > 0 && (
                    <button type="button" onClick={clearAll} className="btn btn-ghost btn-sm text-rose-300">
                      <Trash2 size={16} />
                      {t('custom.clear')}
                    </button>
                  )}
                </div>

                <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {gameType === 'itto' &&
                    stagedIttoThemes.map((item, idx) => (
                      <li key={idx} className="pl-3 pr-1 py-1.5 bg-ground border border-line rounded-xl flex items-center justify-between gap-2">
                        <div className="min-w-0 py-1">
                          <div className="font-bold text-sm text-ink truncate">{item.title}</div>
                          <div className="text-xs text-muted truncate">
                            1: {item.min_label} · 100: {item.max_label}
                            {item.category && ` · ${item.category}`}
                          </div>
                        </div>
                        {removeBtn(() => setStagedIttoThemes((prev) => prev.filter((_, i) => i !== idx)))}
                      </li>
                    ))}

                  {gameType === 'wavelength' &&
                    stagedWaveThemes.map((item, idx) => (
                      <li key={idx} className="pl-3 pr-1 py-1.5 bg-ground border border-line rounded-xl flex items-center justify-between gap-2">
                        <div className="min-w-0 py-1 text-sm">
                          <span className="font-bold text-ink">{item.left}</span>
                          <span className="text-muted"> ↔ </span>
                          <span className="font-bold text-ink">{item.right}</span>
                          {item.category && <span className="text-xs text-muted"> · {item.category}</span>}
                        </div>
                        {removeBtn(() => setStagedWaveThemes((prev) => prev.filter((_, i) => i !== idx)))}
                      </li>
                    ))}

                  {gameType === 'cah' && (
                    <>
                      {stagedCahBlack.map((item, idx) => (
                        <li key={`b_${idx}`} className="pl-3 pr-1 py-1.5 bg-black border border-zinc-700 rounded-xl flex items-center justify-between gap-2">
                          <div className="min-w-0 py-1 text-sm text-white">
                            <span className="font-bold">{item.text}</span>
                            <span className="ml-2 chip">{t('custom.pick_n', { count: item.pick })}</span>
                          </div>
                          {removeBtn(() => setStagedCahBlack((prev) => prev.filter((_, i) => i !== idx)))}
                        </li>
                      ))}
                      {stagedCahWhite.map((item, idx) => (
                        <li key={`w_${idx}`} className="pl-3 pr-1 py-1.5 bg-white text-slate-900 rounded-xl flex items-center justify-between gap-2">
                          <span className="min-w-0 py-1 text-sm font-semibold">{item.text}</span>
                          {removeBtn(() => setStagedCahWhite((prev) => prev.filter((_, i) => i !== idx)))}
                        </li>
                      ))}
                    </>
                  )}

                  {totalStagedCount === 0 && (
                    <li className="text-center py-6 px-4 text-sm text-muted border border-dashed border-line-strong rounded-2xl">{t('custom.empty')}</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-sm text-body">{t('custom.presets_intro')}</p>
              <ul className="grid grid-cols-1 gap-3">
                {presetList.map((p) => (
                  <li key={p.id} className="p-4 rounded-2xl bg-ground border border-line hover:border-accent-line transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-ink">{p.title}</h3>
                      <p className="text-sm text-muted mt-0.5">{p.desc}</p>
                      <span className="chip mt-2">{presetCount(p)}</span>
                    </div>
                    <button type="button" onClick={() => handleLoadPreset(p)} className="btn btn-primary btn-sm shrink-0">
                      <Plus size={16} />
                      {t('custom.load_pack')}
                    </button>
                  </li>
                ))}
              </ul>
              {importFeedback && importFeedback.type === 'success' && (
                <p role="status" className="p-3 rounded-xl border text-sm flex items-center gap-2 bg-emerald-950 border-emerald-700 text-emerald-100">
                  <Check size={16} />
                  {importFeedback.msg}
                </p>
              )}
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="custom-import" className="text-sm text-body">{t('custom.import_intro')}</label>
                <button type="button" onClick={handleInsertTemplate} className="btn btn-ghost btn-sm text-accent">
                  {t('custom.insert_template')}
                </button>
              </div>
              <textarea
                id="custom-import"
                rows={8}
                placeholder={t('custom.import_ph')}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="field py-3 font-mono text-sm min-h-48"
              />
              {importFeedback && (
                <p
                  role={importFeedback.type === 'error' ? 'alert' : 'status'}
                  className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${
                    importFeedback.type === 'success' ? 'bg-emerald-950 border-emerald-700 text-emerald-100' : 'bg-rose-950 border-rose-700 text-rose-100'
                  }`}
                >
                  {importFeedback.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                  {importFeedback.msg}
                </p>
              )}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2">
                <button type="button" onClick={handleExport} disabled={totalStagedCount === 0} className="btn btn-secondary btn-sm">
                  <Download size={16} />
                  {t('custom.export')}
                </button>
                <button type="button" onClick={handleProcessImport} className="btn btn-primary">
                  {t('custom.validate')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="custom-save-mode" className="text-sm text-muted whitespace-nowrap">
              {t('custom.save_mode')}
            </label>
            <select
              id="custom-save-mode"
              value={saveMode}
              onChange={(e) => setSaveMode(e.target.value as 'append' | 'replace')}
              className="field min-h-10 py-0 w-auto text-sm"
            >
              <option value="append">{t('custom.mode_append')}</option>
              <option value="replace">{t('custom.mode_replace')}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1 sm:flex-initial">
              {t('common.cancel')}
            </button>
            <button type="button" onClick={handleSaveToRoom} disabled={totalStagedCount === 0} className="btn btn-primary flex-1 sm:flex-initial">
              <Check size={18} strokeWidth={3} />
              {t('custom.save', { count: totalStagedCount })}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
