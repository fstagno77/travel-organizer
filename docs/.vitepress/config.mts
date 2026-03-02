import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Travel Organizer',
  description: 'Documentazione tecnica del progetto Travel Organizer',
  lang: 'it-IT',

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Architettura', link: '/architettura/backend' },
      { text: 'Modello Dati', link: '/modello-dati/viaggio' },
      { text: 'API', link: '/api/endpoint' },
      { text: 'Design System', link: '/design-system/colori' }
    ],

    sidebar: [
      {
        text: 'Introduzione',
        collapsed: false,
        items: [
          { text: 'Panoramica', link: '/introduzione/panoramica' },
          { text: 'Struttura Progetto', link: '/introduzione/struttura-progetto' }
        ]
      },
      {
        text: 'Architettura',
        collapsed: false,
        items: [
          { text: 'Backend', link: '/architettura/backend' },
          { text: 'Frontend', link: '/architettura/frontend' },
          { text: 'Database', link: '/architettura/database' },
          { text: 'Autenticazione', link: '/architettura/autenticazione' },
          { text: 'Condivisione', link: '/architettura/condivisione' }
        ]
      },
      {
        text: 'Modello Dati',
        collapsed: false,
        items: [
          { text: 'Viaggio', link: '/modello-dati/viaggio' },
          { text: 'Voli', link: '/modello-dati/voli' },
          { text: 'Hotel', link: '/modello-dati/hotel' },
          { text: 'Attività', link: '/modello-dati/attivita' },
          { text: 'Viaggiatori', link: '/modello-dati/viaggiatori' }
        ]
      },
      {
        text: 'Logica di Business',
        collapsed: false,
        items: [
          { text: 'Elaborazione PDF', link: '/logica-business/elaborazione-pdf' },
          { text: 'Deduplicazione', link: '/logica-business/deduplicazione' },
          { text: 'Gestione Passeggeri', link: '/logica-business/gestione-passeggeri' },
          { text: 'Date e Rotte', link: '/logica-business/date-e-rotte' },
          { text: 'Email Forwarding', link: '/logica-business/email-forwarding' }
        ]
      },
      {
        text: 'API',
        collapsed: false,
        items: [
          { text: 'Endpoint', link: '/api/endpoint' },
          { text: 'process-pdf', link: '/api/process-pdf' },
          { text: 'add-booking', link: '/api/add-booking' },
          { text: 'manage-activity', link: '/api/manage-activity' },
          { text: 'manage-collaboration', link: '/api/manage-collaboration' },
          { text: 'notifications', link: '/api/notifications' },
          { text: 'Storage', link: '/api/storage' }
        ]
      },
      {
        text: 'Frontend',
        collapsed: false,
        items: [
          { text: 'Dashboard', link: '/frontend/dashboard' },
          { text: 'Pagina Viaggio', link: '/frontend/pagina-viaggio' },
          { text: 'Tab Voli', link: '/frontend/tab-voli' },
          { text: 'Tab Hotel', link: '/frontend/tab-hotel' },
          { text: 'Tab Attività', link: '/frontend/tab-attivita' },
          { text: 'Pannello Laterale', link: '/frontend/pannello-laterale' },
          { text: 'Impostazioni', link: '/frontend/impostazioni' }
        ]
      },
      {
        text: 'Design System',
        collapsed: false,
        items: [
          { text: 'Colori', link: '/design-system/colori' },
          { text: 'Tipografia', link: '/design-system/tipografia' },
          { text: 'Spaziatura', link: '/design-system/spaziatura' },
          { text: 'Pulsanti', link: '/design-system/pulsanti' },
          { text: 'Card', link: '/design-system/card' },
          { text: 'Form', link: '/design-system/form' },
          { text: 'Modali e Pannelli', link: '/design-system/modali-pannelli' },
          { text: 'Navigazione', link: '/design-system/navigazione' },
          { text: 'Badge e Stati', link: '/design-system/badge-stati' },
          { text: 'Icone', link: '/design-system/icone' },
          { text: 'Gradienti e Sfondi', link: '/design-system/gradienti-sfondi' },
          { text: 'Responsive', link: '/design-system/responsive' },
          { text: 'Animazioni', link: '/design-system/animazioni' }
        ]
      }
    ],

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3],
      label: 'In questa pagina'
    },

    docFooter: {
      prev: 'Precedente',
      next: 'Successivo'
    },

    lastUpdated: {
      text: 'Ultimo aggiornamento'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/' }
    ]
  }
})
