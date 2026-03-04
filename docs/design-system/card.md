# Card

Le card sono i componenti principali per visualizzare le informazioni di voli, hotel, attivita e viaggi. Ogni tipo di card ha uno stile e una struttura specifici.

## Card Base `.card`

Lo stile base condiviso da tutte le card.

```css
.card {
  background: var(--color-white);         /* #ffffff */
  border-radius: var(--radius-lg);        /* 12px */
  box-shadow: var(--shadow-md);           /* 0 4px 6px -1px rgba(0,0,0,0.1),
                                              0 2px 4px -1px rgba(0,0,0,0.06) */
  overflow: hidden;
}
```

| Proprieta | Valore |
|-----------|--------|
| Background | `#ffffff` |
| Border radius | 12px (`--radius-lg`) |
| Box shadow | `--shadow-md` |
| Overflow | `hidden` |

---

## Flight Card `.flight-card`

La card volo visualizza le informazioni di un singolo volo con partenza, arrivo, orari e durata. Il design utilizza un header colorato con data e numero volo, e un body con layout a rotta visuale.

### Anteprima

#### Volo futuro

<div style="margin: 16px 0; max-width: 500px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); background: white; font-family: Inter, sans-serif;">
  <div style="background: #2163f6; color: white; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 18px; font-weight: 600;">Sabato, 15 Feb 2026</span>
    <a href="#" style="color: white; text-decoration: underline; font-size: 14px; font-weight: 500;">NH104</a>
  </div>
  <div style="padding: 24px;">
    <h3 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: #111827;">Da Tokyo a Roma</h3>
    <div style="margin-bottom: 20px;">
      <a href="#" style="display: inline-flex; align-items: center; gap: 6px; color: #2163f6; text-decoration: none; font-size: 14px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        Narita International Airport
      </a>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div style="text-align: center; min-width: 60px;">
        <div style="font-size: 2rem; font-weight: 700; color: #111827;">NRT</div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 14px; color: #566378; margin-top: 8px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="m2 9 3 3 8.5-8.5"/></svg>
          14:30
        </div>
        <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">Terminal 1</div>
      </div>
      <div style="flex: 0 0 160px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="width: 100%; border-top: 2px dashed #22c55e; position: relative; margin: 20px 0;">
          <div style="position: absolute; right: -4px; top: -15px; width: 26px; height: 26px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#22c55e" stroke="none"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
          </div>
        </div>
        <div style="font-size: 12px; color: #9ca3af; margin-top: 8px;">12h 15m</div>
      </div>
      <div style="text-align: center; min-width: 60px;">
        <div style="font-size: 2rem; font-weight: 700; color: #111827;">FCO</div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 14px; color: #566378; margin-top: 8px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="m11 13 5.5 5.5"/><path d="m11 13 3 8.5"/></svg>
          22:45
        </div>
        <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">Terminal 3</div>
      </div>
    </div>
  </div>
</div>

#### Volo passato (`.past`)

<div style="margin: 16px 0; max-width: 500px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); background: white; font-family: Inter, sans-serif;">
  <div style="background: #9ca3af; color: white; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 18px; font-weight: 600;">Martedi, 10 Gen 2026</span>
    <a href="#" style="color: white; text-decoration: underline; font-size: 14px; font-weight: 500;">AZ786</a>
  </div>
  <div style="padding: 24px;">
    <h3 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: #111827;">Da Roma a Tokyo</h3>
    <div style="margin-bottom: 20px;">
      <a href="#" style="display: inline-flex; align-items: center; gap: 6px; color: #2163f6; text-decoration: none; font-size: 14px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        Leonardo da Vinci-Fiumicino Airport
      </a>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div style="text-align: center; min-width: 60px;">
        <div style="font-size: 2rem; font-weight: 700; color: #111827;">FCO</div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 14px; color: #566378; margin-top: 8px;">10:30</div>
      </div>
      <div style="flex: 0 0 160px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="width: 100%; border-top: 2px dashed #22c55e; margin: 20px 0;"></div>
        <div style="font-size: 12px; color: #9ca3af; margin-top: 8px;">13h 45m</div>
      </div>
      <div style="text-align: center; min-width: 60px;">
        <div style="font-size: 2rem; font-weight: 700; color: #111827;">NRT</div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 14px; color: #566378; margin-top: 8px;">06:15</div>
      </div>
    </div>
  </div>
</div>

### Struttura

```
.flight-card
  .flight-card-header           (data formattata + numero volo)
  .flight-card-body             (contenuto principale)
    .flight-title               (Da {città} a {città})
    .flight-departure-location  (aeroporto di partenza)
    .flight-route               (layout rotta)
      .flight-endpoint          (partenza)
        .flight-airport-code-lg (codice IATA grande)
        .flight-time-sm         (orario con icona)
        .flight-terminal        (terminal)
      .flight-arc               (linea/arco verde tratteggiato con icona aereo)
      .flight-endpoint          (arrivo)
      .flight-duration          (durata volo)
```

### Base Card

```css
.flight-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);        /* 12px */
  box-shadow: var(--shadow-md);
  overflow: hidden;
  margin-bottom: 16px;
}
```

### Header `.flight-card-header`

```css
.flight-card-header {
  background: var(--color-primary);       /* #2163f6 */
  color: var(--color-white);
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.flight-card-header .flight-date {
  font-size: var(--font-size-lg);         /* 18px */
  font-weight: var(--font-weight-semibold); /* 600 */
}

.flight-card-header .flight-tracking-link {
  color: var(--color-white);
  text-decoration: underline;
  font-size: var(--font-size-sm);         /* 14px */
  font-weight: var(--font-weight-medium); /* 500 */
}
```

| Stato | Background | Colore testo |
|-------|-----------|-------------|
| Volo futuro | `#2163f6` (`--color-primary`) | `#ffffff` |
| Volo passato `.past` | `#9ca3af` (`--color-gray-400`) | `#ffffff` |

```css
.flight-card.past .flight-card-header {
  background: var(--color-gray-400);      /* #9ca3af */
}
```

### Body `.flight-card-body`

```css
.flight-card-body {
  padding: 24px;
}

.flight-title {
  font-size: var(--font-size-2xl);        /* 24px */
  font-weight: var(--font-weight-bold);   /* 700 */
  color: var(--color-gray-800);
  margin-bottom: 12px;
}

.flight-departure-location {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-primary);
  text-decoration: none;
  font-size: var(--font-size-sm);         /* 14px */
  margin-bottom: 20px;
}
```

### Route Layout `.flight-route`

```css
.flight-route {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.flight-endpoint {
  text-align: center;
  min-width: 60px;
}

.flight-airport-code-lg {
  font-size: 2rem;                        /* 32px */
  font-weight: var(--font-weight-bold);   /* 700 */
  color: var(--color-gray-800);
}

.flight-time-sm {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: var(--font-size-sm);         /* 14px */
  color: var(--color-gray-600);
  margin-top: 8px;
}

.flight-terminal {
  font-size: var(--font-size-xs);         /* 12px */
  color: var(--color-gray-500);
  margin-top: 4px;
}

.flight-arc {
  flex: 0 0 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.flight-arc svg {
  stroke: #22c55e;                        /* green-500 */
  stroke-dasharray: 10 6;
  stroke-width: 2;
}

.flight-arc .plane-icon {
  width: 26px;
  height: 26px;
  background: white;
  border-radius: 50%;
  fill: #22c55e;
  transform: rotate(120deg);
}

.flight-duration {
  font-size: var(--font-size-xs);         /* 12px */
  color: var(--color-gray-500);
  margin-top: 8px;
}
```

---

## Hotel Card `.hotel-card`

La card hotel utilizza la palette verde/smeraldo con un header che mostra la data di check-in formattata, e un body con informazioni dettagliate su nome, indirizzo e date.

### Anteprima

<div style="margin: 16px 0; max-width: 500px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); background: white; font-family: Inter, sans-serif;">
  <div style="background: #2e9568; color: white; padding: 20px 16px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 18px; font-weight: 600;">Mercoledi, 11 Feb 2026</span>
  </div>
  <div style="padding: 24px;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
      <h3 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">Hotel Sakura Tokyo</h3>
      <div style="display: inline-block; padding: 4px 12px; background: #edf7f2; color: #155e3e; border-radius: 6px; font-size: 12px; font-weight: 500;">5 notti</div>
    </div>
    <div style="margin-bottom: 24px;">
      <a href="#" style="display: inline-flex; align-items: center; gap: 6px; color: #2163f6; text-decoration: none; font-size: 14px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        Shinjuku, Tokyo
      </a>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
        </div>
        <div style="font-size: 12px; text-transform: uppercase; color: #9ca3af; font-weight: 500; letter-spacing: 0.5px;">Check-in</div>
        <div style="font-size: 20px; font-weight: 700; color: #111827; margin-top: 4px;">11 Feb 2026</div>
        <div style="font-size: 14px; color: #566378; margin-top: 4px;">15:00</div>
      </div>
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
        </div>
        <div style="font-size: 12px; text-transform: uppercase; color: #9ca3af; font-weight: 500; letter-spacing: 0.5px;">Check-out</div>
        <div style="font-size: 20px; font-weight: 700; color: #111827; margin-top: 4px;">16 Feb 2026</div>
        <div style="font-size: 14px; color: #566378; margin-top: 4px;">11:00</div>
      </div>
    </div>
  </div>
</div>

### Struttura

```
.hotel-card
  .hotel-card-header           (data check-in formattata)
  .hotel-card-body             (contenuto principale)
    .hotel-name-section        (nome + badge notti)
      .hotel-name              (nome hotel)
      .hotel-nights-badge      (badge "X notti")
    .hotel-address             (indirizzo con link Google Maps)
    .hotel-checkin-grid        (griglia 2 colonne)
      .hotel-checkin-col       (check-in)
        .hotel-icon-container  (icona verde)
        .hotel-label           (label maiuscolo)
        .hotel-date            (data grande)
        .hotel-time            (orario)
      .hotel-checkout-col      (check-out)
        .hotel-icon-container  (icona grigia)
    .hotel-details-toggle      (pulsante espandibile)
    .hotel-details-content     (sezione espandibile)
```

### Base Card

```css
.hotel-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);        /* 12px */
  box-shadow: var(--shadow-md);
  overflow: hidden;
  margin-bottom: 16px;
}
```

### Header `.hotel-card-header`

```css
.hotel-card-header {
  background: var(--color-hotel-600);     /* #2e9568 */
  color: var(--color-white);
  padding: 20px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hotel-card-header .hotel-checkin-date {
  font-size: var(--font-size-lg);         /* 18px */
  font-weight: var(--font-weight-semibold); /* 600 */
}
```

### Body `.hotel-card-body`

```css
.hotel-card-body {
  padding: 24px;
}

.hotel-name-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.hotel-name {
  font-size: var(--font-size-2xl);        /* 24px */
  font-weight: var(--font-weight-bold);   /* 700 */
  color: var(--color-gray-900);
  margin: 0;
}

.hotel-nights-badge {
  display: inline-block;
  padding: 4px 12px;
  background: var(--color-hotel-100);     /* #edf7f2 */
  color: var(--color-hotel-700);          /* #155e3e */
  border-radius: var(--radius-md);        /* 6px */
  font-size: var(--font-size-xs);         /* 12px */
  font-weight: var(--font-weight-medium); /* 500 */
}

.hotel-address {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-primary);
  text-decoration: none;
  font-size: var(--font-size-sm);         /* 14px */
  margin-bottom: 24px;
}
```

### Check-in Grid `.hotel-checkin-grid`

```css
.hotel-checkin-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.hotel-icon-container {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

/* Check-in icon: green background */
.hotel-checkin-col .hotel-icon-container {
  background: #dcfce7;                    /* green-100 */
}

.hotel-checkin-col .hotel-icon-container svg {
  stroke: #16a34a;                        /* green-600 */
}

/* Check-out icon: gray background */
.hotel-checkout-col .hotel-icon-container {
  background: #f3f4f6;                    /* gray-100 */
}

.hotel-checkout-col .hotel-icon-container svg {
  stroke: #6b7280;                        /* gray-500 */
}

.hotel-label {
  font-size: var(--font-size-xs);         /* 12px */
  text-transform: uppercase;
  color: var(--color-gray-400);
  font-weight: var(--font-weight-medium); /* 500 */
  letter-spacing: 0.5px;
}

.hotel-date {
  font-size: var(--font-size-xl);         /* 20px */
  font-weight: var(--font-weight-bold);   /* 700 */
  color: var(--color-gray-900);
  margin-top: 4px;
}

.hotel-time {
  font-size: var(--font-size-sm);         /* 14px */
  color: var(--color-gray-600);
  margin-top: 4px;
}
```

### Dettagli Espandibili

```css
.hotel-details-toggle {
  /* Pulsante per espandere/collassare dettagli */
  /* Include: booking ref, tipo camera, amenities, prezzo, azioni */
}
```

| Proprieta | Valore |
|-----------|--------|
| Border radius | 12px (`--radius-lg`) |
| Header background | `#2e9568` (`--color-hotel-600`) |
| Body padding | 24px |
| Header padding | 20px 16px |
| Grid gap | 24px |

---

## Activity Card `.activity-card`

Le card attivita vengono visualizzate nella timeline giornaliera della tab Attivita. Ogni card ha colori specifici per categoria.

### Anteprima

<div style="margin: 16px 0; display: flex; gap: 12px; flex-wrap: wrap;">
  <div style="width: 256px; height: 140px; border-radius: 12px; padding: 16px; background: linear-gradient(135deg, #fffbeb, #fff7ed); border: 1px solid #fde68a; font-family: Inter, sans-serif; display: flex; flex-direction: column; cursor: pointer;">
    <div style="width: 36px; height: 36px; border-radius: 8px; background: linear-gradient(135deg, #f97316, #ea580c); display: flex; align-items: center; justify-content: center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg></div>
    <div style="margin-top: auto;">
      <div style="font-size: 14px; font-weight: 600; color: #111827;">Sushi Dai Tsukiji</div>
      <div style="font-size: 12px; color: #566378;">12:30 - 14:00</div>
    </div>
  </div>
  <div style="width: 256px; height: 140px; border-radius: 12px; padding: 16px; background: linear-gradient(135deg, #faf5ff, #faf5ff); border: 1px solid #e9d5ff; font-family: Inter, sans-serif; display: flex; flex-direction: column; cursor: pointer;">
    <div style="width: 36px; height: 36px; border-radius: 8px; background: linear-gradient(135deg, #c084fc, #a855f7); display: flex; align-items: center; justify-content: center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M5 20V8l7-4 7 4v12"/><path d="M9 20v-4h6v4"/></svg></div>
    <div style="margin-top: auto;">
      <div style="font-size: 14px; font-weight: 600; color: #111827;">Museo Nazionale di Tokyo</div>
      <div style="font-size: 12px; color: #566378;">09:00 - 12:00</div>
    </div>
  </div>
</div>

### Dimensioni

```css
.activity-card {
  width: 256px;
  height: 140px;
  border-radius: var(--radius-lg);        /* 12px */
  border: 1px solid;                      /* colore specifico per categoria */
  padding: var(--spacing-4);              /* 16px */
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
  overflow: hidden;
}
```

| Proprieta | Valore |
|-----------|--------|
| Larghezza | 256px |
| Altezza | 140px |
| Border radius | 12px |
| Padding | 16px |
| Bordo | 1px solid (colore per categoria) |

### Stili per Categoria

Ogni categoria ha un gradiente di background, colore bordo e gradiente icona specifici (vedere la pagina [Colori](./colori.md#colori-categorie-attivita) per i valori completi).

```css
/* Esempio: Ristorante */
.activity-card[data-category="restaurant"] {
  background: linear-gradient(135deg, #fffbeb, #fff7ed);
  border-color: #fde68a;
}

/* Esempio: Museo */
.activity-card[data-category="museum"] {
  background: #faf5ff;
  border-color: #e9d5ff;
}
```

### Stato Hover

```css
.activity-card:hover {
  box-shadow: var(--shadow-lg);           /* elevazione aumentata */
  transform: translateY(-2px);            /* leggero sollevamento */
}
```

### Contenuto della Card

```css
.activity-card__icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);        /* 8px */
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-white);
  /* background: gradiente specifico per categoria */
}

.activity-card__name {
  font-size: var(--font-size-sm);         /* 14px */
  font-weight: var(--font-weight-semibold); /* 600 */
  color: var(--color-gray-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-card__time {
  font-size: var(--font-size-xs);         /* 12px */
  color: var(--color-gray-500);
}
```

---

## Trip Card `.trip-card`

La card viaggio viene mostrata nella lista viaggi nella pagina principale.

### Anteprima

<div style="margin: 16px 0; max-width: 300px; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; font-family: Inter, sans-serif; cursor: pointer;">
  <div style="height: 140px; background: linear-gradient(135deg, #dbeafe, #bfdbfe); display: flex; align-items: center; justify-content: center;">
    <span style="font-size: 48px;">&#x2708;</span>
  </div>
  <div style="padding: 16px 20px;">
    <div style="font-size: 16px; font-weight: 700; color: #111827;">Giappone 2026</div>
    <div style="font-size: 13px; color: #566378; margin-top: 4px;">15 Mar - 28 Mar 2026</div>
    <div style="font-size: 13px; color: #9ca3af; margin-top: 2px;">Tokyo, Kyoto, Osaka</div>
  </div>
</div>

```css
.trip-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);        /* 12px */
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-normal); /* 250ms */
}

.trip-card:hover {
  transform: translateY(-4px);
  border-color: #93c5fd;
  box-shadow: var(--shadow-xl);
}
```

| Proprieta | Stato Default | Stato Hover |
|-----------|--------------|-------------|
| Transform | nessuno | `translateY(-4px)` |
| Border color | `#e2e8f0` | `#93c5fd` |
| Box shadow | `0 10px 15px -3px rgba(0,0,0,0.1)` | `--shadow-xl` |

### Struttura

```
.trip-card
  .trip-card__image          (immagine di copertina)
  .trip-card__content        (titolo, date, destinazione)
    .trip-card__title
    .trip-card__dates
    .trip-card__destination
```

---

## Current Trip Card `.current-trip-card`

La card del viaggio corrente/in evidenza ha uno stile premium con angoli piu arrotondati e ombre piu pronunciate.

### Anteprima

<div style="margin: 16px 0; display: flex; gap: 24px; flex-wrap: wrap; align-items: start;">
  <div>
    <div style="font-size: 12px; color: #9ca3af; margin-bottom: 6px; font-family: Inter, sans-serif;">Trip Card (radius: 12px)</div>
    <div style="width: 220px; height: 160px; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; font-family: Inter, sans-serif;">
      <div style="height: 90px; background: linear-gradient(135deg, #dbeafe, #bfdbfe);"></div>
      <div style="padding: 12px 16px;">
        <div style="font-size: 14px; font-weight: 600; color: #111827;">Viaggio Standard</div>
        <div style="font-size: 11px; color: #566378;">15 - 22 Mar 2026</div>
      </div>
    </div>
  </div>
  <div>
    <div style="font-size: 12px; color: #9ca3af; margin-bottom: 6px; font-family: Inter, sans-serif;">Current Trip Card (radius: 24px)</div>
    <div style="width: 220px; height: 160px; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); font-family: Inter, sans-serif;">
      <div style="height: 90px; background: linear-gradient(135deg, #93c5fd, #3b82f6);"></div>
      <div style="padding: 12px 16px;">
        <div style="font-size: 14px; font-weight: 600; color: #111827;">Viaggio Corrente</div>
        <div style="font-size: 11px; color: #566378;">15 - 22 Mar 2026</div>
      </div>
    </div>
  </div>
</div>

```css
.current-trip-card {
  border-radius: 24px;
  box-shadow: var(--shadow-xl);           /* 0 20px 25px -5px rgba(0,0,0,0.1),
                                              0 10px 10px -5px rgba(0,0,0,0.04) */
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.current-trip-card:hover {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  transform: translateY(-4px);
}
```

| Proprieta | Stato Default | Stato Hover |
|-----------|--------------|-------------|
| Border radius | 24px | 24px |
| Box shadow | `--shadow-xl` | `0 25px 50px -12px rgba(0,0,0,0.25)` |
| Transform | nessuno | `translateY(-4px)` |

---

## Confronto Rapido

| Card | Border Radius | Shadow | Header BG | Body Padding |
|------|--------------|--------|-----------|-------------|
| Flight | 12px (`--radius-lg`) | `--shadow-md` | `#2163f6` | 24px |
| Hotel | 12px (`--radius-lg`) | `--shadow-md` | `#2e9568` | 24px |
| Activity | 12px (`--radius-lg`) | nessuna | gradiente | 16px |
| Trip | 12px (`--radius-lg`) | custom | - | - |
| Current Trip | 24px | `--shadow-xl` | - | - |

---

## Linee Guida

1. **Non mischiare gli stili**: le card volo usano sempre la palette blu, le hotel la verde.
2. **Hover consistente**: tutte le card interattive devono avere un feedback visivo al passaggio del mouse.
3. **Overflow hidden**: impostare sempre `overflow: hidden` per evitare che il contenuto esca dagli angoli arrotondati.
4. **Voli passati**: usare lo stato `.past` sull'header per comunicare visivamente che un volo e gia avvenuto.
5. **Activity card**: rispettare le dimensioni fisse (256x140px) per garantire l'allineamento nella timeline.
6. **Gerarchia ombre**: card a riposo con `--shadow-md`, hover con `--shadow-lg`, card premium con `--shadow-xl`.
