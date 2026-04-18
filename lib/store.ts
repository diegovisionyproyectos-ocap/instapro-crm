import type { Contact, Deal } from './types';
import { geocodeLocation } from './geocoding';

let contacts: Contact[] = [
  {
    id: '1',
    client_code: 'CLI-0001',
    name: 'María García',
    email: 'maria@techsolutions.es',
    phone: '+34 600 123 456',
    company: 'TechSolutions S.L.',
    status: 'customer',
    city: 'Madrid',
    address: null,
    lat: 40.4168,
    lng: -3.7038,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    client_code: 'CLI-0002',
    name: 'Carlos Romero',
    email: 'carlos@innova.io',
    phone: '+34 611 222 333',
    company: 'Innova Digital',
    status: 'prospect',
    city: 'Barcelona',
    address: null,
    lat: 41.3851,
    lng: 2.1734,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    client_code: 'CLI-0003',
    name: 'Laura Sánchez',
    email: 'laura@mediagroup.com',
    phone: '+34 622 444 555',
    company: 'Media Group',
    status: 'lead',
    city: 'Valencia',
    address: null,
    lat: 39.4699,
    lng: -0.3763,
    created_at: new Date().toISOString(),
  },
  {
    id: '4',
    client_code: 'CLI-0004',
    name: 'Pedro Martínez',
    email: 'pedro@solarsur.es',
    phone: '+34 633 555 666',
    company: 'Solar Sur S.A.',
    status: 'customer',
    city: 'Sevilla',
    address: null,
    lat: 37.3891,
    lng: -5.9845,
    created_at: new Date().toISOString(),
  },
  {
    id: '5',
    client_code: 'CLI-0005',
    name: 'Ana Torres',
    email: 'ana@basquetech.com',
    phone: '+34 644 666 777',
    company: 'Basque Tech',
    status: 'prospect',
    city: 'Bilbao',
    address: null,
    lat: 43.263,
    lng: -2.9349,
    created_at: new Date().toISOString(),
  },
];

let deals: Deal[] = [
  {
    id: '1',
    title: 'Instalación eléctrica - Edificio Norte',
    contact_id: '1',
    contact_name: 'María García',
    stage: 'following',
    value: 15000,
    close_date: '2026-06-30',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Red de datos - Oficina central',
    contact_id: '2',
    contact_name: 'Carlos Romero',
    stage: 'following',
    value: 8500,
    close_date: '2026-05-15',
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Iluminación LED - Local comercial',
    contact_id: '3',
    contact_name: 'Laura Sánchez',
    stage: 'lost',
    value: 4200,
    close_date: '2026-07-01',
    created_at: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'Panel solar industrial',
    contact_id: '4',
    contact_name: 'Pedro Martínez',
    stage: 'won',
    value: 32000,
    close_date: '2026-03-15',
    created_at: new Date().toISOString(),
  },
];

export const store = {
  getContacts: () => [...contacts].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  getContact: (id: string) => contacts.find((c) => c.id === id),
  createContact: (data: Omit<Contact, 'id' | 'created_at'>): Contact => {
    const contact: Contact = { ...data, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    contacts.push(contact);
    return contact;
  },
  updateContact: (id: string, data: Partial<Contact>): Contact | null => {
    const idx = contacts.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    contacts[idx] = { ...contacts[idx], ...data };
    return contacts[idx];
  },
  deleteContact: (id: string) => {
    contacts = contacts.filter((c) => c.id !== id);
  },

  getDeals: () => [...deals].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  getDeal: (id: string) => deals.find((d) => d.id === id),
  createDeal: (data: Omit<Deal, 'id' | 'created_at'>): Deal => {
    const deal: Deal = { ...data, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    deals.push(deal);
    return deal;
  },
  updateDeal: (id: string, data: Partial<Deal>): Deal | null => {
    const idx = deals.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    deals[idx] = { ...deals[idx], ...data };
    return deals[idx];
  },
  deleteDeal: (id: string) => {
    deals = deals.filter((d) => d.id !== id);
  },
};

export async function geocodeCity(city: string): Promise<{ lat: number; lng: number } | null> {
  return geocodeLocation(city);
}
