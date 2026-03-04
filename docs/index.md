---
layout: home

hero:
  name: Travel Organizer
  text: Documentazione Tecnica
  tagline: Guida completa all'architettura, modello dati, API e design system
  actions:
    - theme: brand
      text: Panoramica
      link: /introduzione/panoramica
    - theme: alt
      text: Design System
      link: /design-system/colori

features:
  - icon: 🏗️
    title: Architettura
    details: Backend con Netlify Functions, Supabase, storage e autenticazione OAuth/OTP.
    link: /architettura/backend
  - icon: 📊
    title: Modello Dati
    details: Struttura JSON dei viaggi, voli multi-passeggero, hotel, attività e viaggiatori.
    link: /modello-dati/viaggio
  - icon: ⚙️
    title: Logica di Business
    details: Elaborazione PDF con Claude AI, deduplicazione, gestione passeggeri e email forwarding.
    link: /logica-business/elaborazione-pdf
  - icon: 🔌
    title: API
    details: Endpoint Netlify Functions per creazione viaggi, prenotazioni, attività e storage.
    link: /api/endpoint
  - icon: 🖥️
    title: Frontend
    details: Dashboard, pagina viaggio con tab system, pannello laterale e impostazioni.
    link: /frontend/dashboard
  - icon: 🎨
    title: Design System
    details: Colori, tipografia, componenti, icone, responsive design e animazioni.
    link: /design-system/colori
---
