
import { GameItem, Category, Faction, Gender } from './types';

export const ITEMS: GameItem[] = [
  {
    id: 'default-1',
    name: 'Dragón de Escarcha',
    category: Category.MOUNT,
    image: 'https://media.discordapp.net/attachments/1460068773175492641/1460108918108852366/img_81.jpg?ex=6965b7e5&is=69646665&hm=a7e75adc4d118167bb2bb7b2bb31788a19bbfd5c922679a20128ba599684ea38&=&format=webp&width=816&height=466',
    description: 'Una bestia ancestral que respira el frío absoluto de las tierras del norte.',
    stats: 'Velocidad +150% | Resistencia al Frío'
  },
  {
    id: 'default-2',
    name: 'Pantera de Sombras',
    category: Category.MOUNT,
    image: 'https://images.unsplash.com/photo-1544911845-1f34a3eb46b1?q=80&w=1000&auto=format&fit=crop',
    description: 'Nacida de las pesadillas de los bosques de la Furia, se mueve sin emitir sonido.',
    stats: 'Sigilo aumentado | Velocidad +140%'
  },
  {
    id: 'default-3',
    name: 'Armadura del Paladín Real',
    category: Category.COSTUME,
    faction: Faction.LIGHT,
    gender: Gender.BOTH,
    image: 'https://images.unsplash.com/photo-1583440251276-886866f81734?q=80&w=1000&auto=format&fit=crop',
    description: 'Forjada con oro bendecido por Etain para los guerreros más puros.',
    item_class: 'Luchador',
    stats: 'Defensa Física +50 | Resistencia Mágica +20'
  },
  {
    id: 'default-4',
    name: 'Manto del Ejecutor Carmesí',
    category: Category.COSTUME,
    faction: Faction.FURY,
    gender: Gender.MALE,
    image: 'https://images.unsplash.com/photo-1599408162162-cdbaf18a651b?q=80&w=1000&auto=format&fit=crop',
    description: 'Las manchas de sangre son parte del diseño, o al menos eso dicen los artesanos de la Furia.',
    item_class: 'War',
    stats: 'Daño Crítico +15% | Fuerza +30'
  }
];
