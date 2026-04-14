/**
 * Seed: Test User + 3 Dummy Trips
 *
 * Crea un utente dummy per simulazioni e testing.
 * Include: profilo utente, 3 viaggi 2027 completi con tutti i tipi di booking.
 *
 * Utilizzo:
 *   node scripts/seed-test-user.js
 *   node scripts/seed-test-user.js --reset   (ricrea i viaggi da zero)
 *   node scripts/seed-test-user.js --link     (stampa solo magic link per utente esistente)
 *
 * Requisiti:
 *   - SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in .env
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Mancano SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ─── Config utente dummy ────────────────────────────────────────────────────

const TEST_EMAIL    = 'test@travel-flow.com';
const TEST_USERNAME = 'testuser';
const TEST_NAME     = 'Test User';

// ─── Dati dei 3 viaggi ──────────────────────────────────────────────────────

const TRIPS = [

  // ─── VIAGGIO 1: Barcellona — Voli + Hotel + Attività ────────────────────
  {
    id: '2027-06-barcelona',
    data: {
      id: '2027-06-barcelona',
      title: { it: 'Barcellona 2027', en: 'Barcelona 2027' },
      destination: 'Barcelona',
      startDate: '2027-06-07',
      endDate: '2027-06-13',
      route: 'REG → LIN → BCN → LIN → REG',
      color: '#e11d48',
      passenger: { name: TEST_NAME, type: 'ADT' },

      flights: [
        {
          id: 'flight-1',
          date: '2027-06-07',
          flightNumber: 'AZ1196',
          airline: 'ITA Airways',
          operatedBy: 'ITA Airways',
          departure: { code: 'REG', city: 'Reggio di Calabria', airport: 'Reggio Calabria Airport', terminal: null },
          arrival:   { code: 'LIN', city: 'Milan',             airport: 'Linate',                  terminal: null },
          departureTime: '07:05', arrivalTime: '08:45',
          arrivalNextDay: false, duration: '01:40',
          class: 'Y', bookingReference: 'TST001', ticketNumber: '055 9900000001',
          seat: '14A', baggage: '1PC', status: 'OK'
        },
        {
          id: 'flight-2',
          date: '2027-06-07',
          flightNumber: 'VY6218',
          airline: 'Vueling',
          operatedBy: 'Vueling',
          departure: { code: 'LIN', city: 'Milan',     airport: 'Linate',            terminal: null },
          arrival:   { code: 'BCN', city: 'Barcelona', airport: 'Josep Tarradellas',  terminal: '1' },
          departureTime: '10:30', arrivalTime: '12:15',
          arrivalNextDay: false, duration: '01:45',
          class: 'Y', bookingReference: 'TST002', ticketNumber: 'VY-9900000002',
          seat: '22B', baggage: '1PC', status: 'OK'
        },
        {
          id: 'flight-3',
          date: '2027-06-13',
          flightNumber: 'VY6219',
          airline: 'Vueling',
          operatedBy: 'Vueling',
          departure: { code: 'BCN', city: 'Barcelona', airport: 'Josep Tarradellas',  terminal: '1' },
          arrival:   { code: 'LIN', city: 'Milan',     airport: 'Linate',            terminal: null },
          departureTime: '14:00', arrivalTime: '15:50',
          arrivalNextDay: false, duration: '01:50',
          class: 'Y', bookingReference: 'TST002', ticketNumber: 'VY-9900000002',
          seat: '22B', baggage: '1PC', status: 'OK'
        },
        {
          id: 'flight-4',
          date: '2027-06-13',
          flightNumber: 'AZ1197',
          airline: 'ITA Airways',
          operatedBy: 'ITA Airways',
          departure: { code: 'LIN', city: 'Milan',             airport: 'Linate',                  terminal: null },
          arrival:   { code: 'REG', city: 'Reggio di Calabria', airport: 'Reggio Calabria Airport', terminal: null },
          departureTime: '17:30', arrivalTime: '19:10',
          arrivalNextDay: false, duration: '01:40',
          class: 'Y', bookingReference: 'TST001', ticketNumber: '055 9900000001',
          seat: '14A', baggage: '1PC', status: 'OK'
        }
      ],

      hotels: [
        {
          id: 'hotel-1',
          name: 'Hotel Arts Barcelona',
          address: {
            street: 'Carrer de la Marina, 19-21',
            city: 'Barcelona',
            state: 'Catalunya',
            postalCode: '08005',
            country: 'Spagna',
            fullAddress: 'Carrer de la Marina, 19-21, 08005 Barcelona, Spagna'
          },
          coordinates: { lat: 41.3894, lng: 2.1985 },
          phone: '+34 93 221 10 00',
          checkIn:  { date: '2027-06-07', time: '15:00' },
          checkOut: { date: '2027-06-13', time: '12:00' },
          nights: 6, rooms: 1,
          roomType: { it: 'Camera Deluxe Vista Mare', en: 'Deluxe Sea View Room' },
          guests: 1,
          guestName: TEST_NAME,
          confirmationNumber: 'HA-TST-00001',
          price: {
            room:    { value: 1800, currency: 'EUR' },
            tax:     { value:  220, currency: 'EUR' },
            total:   { value: 2020, currency: 'EUR' }
          },
          payment: { method: 'Carta di credito', prepayment: true },
          cancellation: { freeCancellationUntil: '2027-06-01T23:59:00', penaltyAfter: { value: 300, currency: 'EUR' } },
          amenities: ['WiFi gratuito', 'Piscina', 'Spa', 'Ristorante', 'Bar', 'Palestra', 'Vista mare'],
          notes: { it: 'Early check-in richiesto alle 12:00 se disponibile', en: 'Early check-in requested at 12:00 if available' },
          source: 'Booking.com'
        }
      ],

      activities: [
        {
          id: 'act-bcn-1',
          name: 'Sagrada Família',
          description: 'Visita guidata con accesso alle torri',
          date: '2027-06-08',
          startTime: '09:00',
          endTime: '12:00',
          category: 'museo',
          location: { address: 'Carrer de Mallorca, 401, Barcellona' },
          price: { value: 36, currency: 'EUR' }
        },
        {
          id: 'act-bcn-2',
          name: 'Park Güell',
          description: 'Passeggiata nel parco con zona monumentale',
          date: '2027-06-08',
          startTime: '14:00',
          endTime: '16:30',
          category: 'attrazione',
          location: { address: 'Carrer d\'Olot, 5, Barcellona' },
          price: { value: 14, currency: 'EUR' }
        },
        {
          id: 'act-bcn-3',
          name: 'Mercato della Boqueria',
          description: 'Visita al mercato storico, colazione e degustazione locale',
          date: '2027-06-09',
          startTime: '08:30',
          endTime: '10:30',
          category: 'ristorante',
          location: { address: 'La Rambla, 91, Barcellona' }
        },
        {
          id: 'act-bcn-4',
          name: 'Spiaggia di Barceloneta',
          description: 'Pomeriggio in spiaggia',
          date: '2027-06-09',
          startTime: '14:00',
          endTime: '18:00',
          category: 'luogo',
          location: { address: 'Barceloneta Beach, Barcellona' }
        },
        {
          id: 'act-bcn-5',
          name: 'Museo Picasso',
          description: 'Collezione permanente e mostra temporanea',
          date: '2027-06-10',
          startTime: '10:00',
          endTime: '13:00',
          category: 'museo',
          location: { address: 'Carrer de Montcada, 15-23, Barcellona' },
          price: { value: 14, currency: 'EUR' }
        }
      ]
    }
  },

  // ─── VIAGGIO 2: Firenze / Toscana — Hotel + Treni + Noleggio + Attività ──
  {
    id: '2027-08-firenze',
    data: {
      id: '2027-08-firenze',
      title: { it: 'Toscana Estate 2027', en: 'Tuscany Summer 2027' },
      destination: 'Florence',
      startDate: '2027-08-14',
      endDate: '2027-08-21',
      route: 'REG → FI → REG',
      color: '#d97706',
      passenger: { name: TEST_NAME, type: 'ADT' },

      flights: [],

      hotels: [
        {
          id: 'hotel-1',
          name: 'Hotel Lungarno',
          address: {
            street: 'Borgo San Jacopo, 14',
            city: 'Florence',
            state: 'Toscana',
            postalCode: '50125',
            country: 'Italia',
            fullAddress: 'Borgo San Jacopo, 14, 50125 Firenze, Italia'
          },
          coordinates: { lat: 43.7677, lng: 11.2529 },
          phone: '+39 055 27261',
          checkIn:  { date: '2027-08-14', time: '15:00' },
          checkOut: { date: '2027-08-20', time: '11:00' },
          nights: 6, rooms: 1,
          roomType: { it: 'Junior Suite con Vista Arno', en: 'Junior Suite Arno View' },
          guests: 1,
          guestName: TEST_NAME,
          confirmationNumber: 'HL-TST-00002',
          price: {
            room:    { value: 1680, currency: 'EUR' },
            tax:     { value:  180, currency: 'EUR' },
            total:   { value: 1860, currency: 'EUR' }
          },
          payment: { method: 'Carta di credito', prepayment: false },
          cancellation: { freeCancellationUntil: '2027-08-08T23:59:00', penaltyAfter: { value: 280, currency: 'EUR' } },
          amenities: ['WiFi gratuito', 'Vista Arno', 'Bar sul fiume', 'Servizio in camera', 'Concierge'],
          source: 'Hotels.com'
        }
      ],

      trains: [
        {
          id: 'train-1',
          date: '2027-08-14',
          trainNumber: 'FA 9488',
          operator: 'Trenitalia',
          class: '1ª',
          departure: { station: 'Reggio Calabria Centrale', city: 'Reggio di Calabria', time: '06:40' },
          arrival:   { station: 'Firenze Santa Maria Novella', city: 'Firenze', time: '14:55' },
          bookingReference: 'TR-TST-00003',
          ticketNumber: 'TI-9900000003',
          seat: '12A - Carrozza 3',
          price: { value: 89, currency: 'EUR' }
        },
        {
          id: 'train-2',
          date: '2027-08-20',
          trainNumber: 'FA 9487',
          operator: 'Trenitalia',
          class: '1ª',
          departure: { station: 'Firenze Santa Maria Novella', city: 'Firenze', time: '15:10' },
          arrival:   { station: 'Reggio Calabria Centrale', city: 'Reggio di Calabria', time: '23:25' },
          bookingReference: 'TR-TST-00003',
          ticketNumber: 'TI-9900000003',
          seat: '12A - Carrozza 3',
          price: { value: 89, currency: 'EUR' }
        }
      ],

      rentals: [
        {
          id: 'rental-1',
          provider: 'Europcar',
          date:    '2027-08-15',
          endDate: '2027-08-18',
          rentalDays: 3,
          driverName: TEST_NAME,
          vehicle: {
            category: 'SUV',
            make: 'Volkswagen',
            model: 'Tiguan',
            licensePlate: 'TS 000 00'
          },
          pickupLocation:  { city: 'Firenze', address: 'Via Jacopo da Diacceto, 56 - Rifredi', time: '09:00' },
          dropoffLocation: { city: 'Firenze', address: 'Via Jacopo da Diacceto, 56 - Rifredi', time: '19:00' },
          bookingReference: 'EU-TST-00004',
          confirmationNumber: 'EU-TST-00004',
          insurance: { value: 45, currency: 'EUR' },
          price: { value: 195, currency: 'EUR' },
          totalAmount: { value: 240, currency: 'EUR' }
        }
      ],

      activities: [
        {
          id: 'act-fi-1',
          name: 'Galleria degli Uffizi',
          description: 'Visita guidata alle collezioni rinascimentali, prenotazione saltafila',
          date: '2027-08-15',
          startTime: '10:00',
          endTime: '14:00',
          category: 'museo',
          location: { address: 'Piazzale degli Uffizi, 6, Firenze' },
          price: { value: 20, currency: 'EUR' }
        },
        {
          id: 'act-fi-2',
          name: 'Piazzale Michelangelo',
          description: 'Tramonto panoramico sulla città',
          date: '2027-08-15',
          startTime: '19:00',
          endTime: '21:00',
          category: 'luogo',
          location: { address: 'Piazzale Michelangelo, Firenze' }
        },
        {
          id: 'act-fi-3',
          name: 'Wine Tour nel Chianti',
          description: 'Tour guidato di mezza giornata tra le vigne del Chianti Classico, degustazione inclusa',
          date: '2027-08-16',
          startTime: '09:30',
          endTime: '14:30',
          category: 'attrazione',
          location: { address: 'Greve in Chianti (SI), Toscana' },
          price: { value: 75, currency: 'EUR' }
        },
        {
          id: 'act-fi-4',
          name: 'Gita a Siena',
          description: 'Piazza del Campo, Duomo di Siena e Torre del Mangia',
          date: '2027-08-17',
          startTime: '09:00',
          endTime: '18:00',
          category: 'attrazione',
          location: { address: 'Piazza del Campo, Siena' },
          price: { value: 15, currency: 'EUR' }
        },
        {
          id: 'act-fi-5',
          name: 'Cena al Buca Mario',
          description: 'Ristorante storico, cucina toscana tradizionale',
          date: '2027-08-18',
          startTime: '20:00',
          endTime: '22:30',
          category: 'ristorante',
          location: { address: 'Piazza degli Ottaviani 16r, Firenze' }
        }
      ]
    }
  },

  // ─── VIAGGIO 3: Milano — Ferry + Bus + Volo + Hotel + Attività ────────────
  // Route completa: Messina → Ferry → VSG → Bus → REG airport → Volo → LIN
  //                 ritorno: LIN → Volo → REG → Bus → VSG → Ferry → Messina
  {
    id: '2027-11-milano',
    data: {
      id: '2027-11-milano',
      title: { it: 'Milano Novembre 2027', en: 'Milan November 2027' },
      destination: 'Milan',
      startDate: '2027-11-18',
      endDate: '2027-11-24',
      route: 'MES → Ferry → VSG → Bus → REG → LIN → REG → Bus → VSG → Ferry → MES',
      color: '#0066cc',
      passenger: { name: TEST_NAME, type: 'ADT' },

      ferries: [
        {
          id: 'ferry-1',
          date: '2027-11-18',
          operator: 'Caronte & Tourist',
          ferryName: 'Telepass Fast',
          routeNumber: 'ME-VSG',
          departure: { port: 'Porto di Messina', city: 'Messina', time: '08:00' },
          arrival:   { port: 'Villa San Giovanni', city: 'Villa San Giovanni', time: '08:20' },
          duration: '00:20',
          bookingReference: 'CT-TST-00005',
          ticketNumber: 'CT-9900000005',
          passengers: [{ name: TEST_NAME, type: 'ADT' }],
          vehicles: [],
          price: { value: 3.50, currency: 'EUR' }
        },
        {
          id: 'ferry-2',
          date: '2027-11-24',
          operator: 'Caronte & Tourist',
          ferryName: 'Telepass Fast',
          routeNumber: 'VSG-ME',
          _isReturn: true,
          departure: { port: 'Villa San Giovanni', city: 'Villa San Giovanni', time: '20:30' },
          arrival:   { port: 'Porto di Messina', city: 'Messina', time: '20:50' },
          duration: '00:20',
          bookingReference: 'CT-TST-00005',
          ticketNumber: 'CT-9900000005',
          passengers: [{ name: TEST_NAME, type: 'ADT' }],
          vehicles: [],
          price: { value: 3.50, currency: 'EUR' }
        }
      ],

      buses: [
        {
          id: 'bus-1',
          date: '2027-11-18',
          operator: 'Autoservizi Romani',
          routeNumber: 'VSG-REG',
          departure: { station: 'Autostazione Villa San Giovanni', city: 'Villa San Giovanni', time: '08:35' },
          arrival:   { station: 'Aeroporto Reggio Calabria', city: 'Reggio di Calabria', time: '09:20' },
          bookingReference: 'AR-TST-00006',
          price: { value: 4, currency: 'EUR' }
        },
        {
          id: 'bus-2',
          date: '2027-11-24',
          operator: 'Autoservizi Romani',
          routeNumber: 'REG-VSG',
          departure: { station: 'Aeroporto Reggio Calabria', city: 'Reggio di Calabria', time: '18:30' },
          arrival:   { station: 'Autostazione Villa San Giovanni', city: 'Villa San Giovanni', time: '19:15' },
          bookingReference: 'AR-TST-00006',
          price: { value: 4, currency: 'EUR' }
        }
      ],

      flights: [
        {
          id: 'flight-1',
          date: '2027-11-18',
          flightNumber: 'AZ1196',
          airline: 'ITA Airways',
          operatedBy: 'ITA Airways',
          departure: { code: 'REG', city: 'Reggio di Calabria', airport: 'Reggio Calabria Airport', terminal: null },
          arrival:   { code: 'LIN', city: 'Milan',              airport: 'Linate',                  terminal: null },
          departureTime: '12:35', arrivalTime: '14:15',
          arrivalNextDay: false, duration: '01:40',
          class: 'L', bookingReference: 'TST007', ticketNumber: '055 9900000007',
          seat: '8C', baggage: '0PC', status: 'OK'
        },
        {
          id: 'flight-2',
          date: '2027-11-24',
          flightNumber: 'AZ1197',
          airline: 'ITA Airways',
          operatedBy: 'ITA Airways',
          departure: { code: 'LIN', city: 'Milan',              airport: 'Linate',                  terminal: null },
          arrival:   { code: 'REG', city: 'Reggio di Calabria', airport: 'Reggio Calabria Airport', terminal: null },
          departureTime: '15:05', arrivalTime: '16:50',
          arrivalNextDay: false, duration: '01:45',
          class: 'L', bookingReference: 'TST007', ticketNumber: '055 9900000007',
          seat: '8C', baggage: '0PC', status: 'OK'
        }
      ],

      hotels: [
        {
          id: 'hotel-1',
          name: 'Hotel Nhow Milano',
          address: {
            street: 'Via Tortona, 35',
            city: 'Milan',
            state: 'Lombardia',
            postalCode: '20144',
            country: 'Italia',
            fullAddress: 'Via Tortona, 35, 20144 Milano, Italia'
          },
          coordinates: { lat: 45.4574, lng: 9.1683 },
          phone: '+39 02 489 8861',
          checkIn:  { date: '2027-11-18', time: '15:00' },
          checkOut: { date: '2027-11-24', time: '11:00' },
          nights: 6, rooms: 1,
          roomType: { it: 'Camera Superior Design', en: 'Superior Design Room' },
          guests: 1,
          guestName: TEST_NAME,
          confirmationNumber: 'NH-TST-00008',
          price: {
            room:    { value: 840, currency: 'EUR' },
            tax:     { value:  96, currency: 'EUR' },
            total:   { value: 936, currency: 'EUR' }
          },
          payment: { method: 'Pay at property', prepayment: false },
          cancellation: { freeCancellationUntil: '2027-11-15T23:59:00', penaltyAfter: { value: 140, currency: 'EUR' } },
          amenities: ['WiFi gratuito', 'Palestra', 'Bar', 'Design hotel', 'Porta Genova a piedi'],
          source: 'Expedia'
        }
      ],

      activities: [
        {
          id: 'act-mi-1',
          name: 'Duomo di Milano',
          description: 'Visita con accesso alle terrazze, prenotazione online',
          date: '2027-11-19',
          startTime: '10:00',
          endTime: '12:30',
          category: 'attrazione',
          location: { address: 'Piazza del Duomo, 20122 Milano' },
          price: { value: 13, currency: 'EUR' }
        },
        {
          id: 'act-mi-2',
          name: 'Navigli — aperitivo',
          description: 'Passeggiata lungo i Navigli e aperitivo in enoteca',
          date: '2027-11-19',
          startTime: '18:00',
          endTime: '20:30',
          category: 'ristorante',
          location: { address: 'Naviglio Grande, Milano' }
        },
        {
          id: 'act-mi-3',
          name: 'Pinacoteca di Brera',
          description: 'Capolavori del Rinascimento italiano',
          date: '2027-11-20',
          startTime: '09:30',
          endTime: '12:30',
          category: 'museo',
          location: { address: 'Via Brera, 28, 20121 Milano' },
          price: { value: 15, currency: 'EUR' }
        },
        {
          id: 'act-mi-4',
          name: 'Shopping Corso Buenos Aires',
          description: 'Uno dei viali commerciali più lunghi d\'Europa',
          date: '2027-11-21',
          startTime: '10:00',
          endTime: '14:00',
          category: 'attrazione',
          location: { address: 'Corso Buenos Aires, Milano' }
        },
        {
          id: 'act-mi-5',
          name: 'Concerto all\'Auditorium di Milano',
          description: 'Orchestra Verdi — programma Beethoven',
          date: '2027-11-22',
          startTime: '21:00',
          endTime: '23:00',
          category: 'attrazione',
          location: { address: 'Largo Gustav Mahler, 1, Milano' },
          price: { value: 35, currency: 'EUR' }
        }
      ]
    }
  }
];

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const resetMode = args.includes('--reset');
  const linkOnly  = args.includes('--link');

  console.log('\n🚀 Travel Flow — Seed Test User\n');

  // ── Trova o crea l'utente ─────────────────────────────────────────────────

  let userId;

  // Cerca se esiste già
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(u => u.email === TEST_EMAIL);

  if (existing) {
    userId = existing.id;
    console.log(`✓ Utente esistente trovato: ${userId}`);
  } else {
    console.log(`→ Creo utente ${TEST_EMAIL}...`);
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      email_confirm: true,
      user_metadata: { username: TEST_USERNAME }
    });
    if (createErr) {
      console.error('Errore creazione utente:', createErr.message);
      process.exit(1);
    }
    userId = newUser.user.id;
    console.log(`✓ Utente creato: ${userId}`);
  }

  // ── Genera magic link ──────────────────────────────────────────────────────

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: TEST_EMAIL
  });

  if (linkErr) {
    console.warn('⚠ Magic link non generato:', linkErr.message);
  } else {
    console.log('\n🔗 Magic Link (valido 24h):');
    console.log(linkData.properties?.action_link || linkData.action_link || '[link non disponibile]');
    console.log('\n   Per login immediato: incolla questo URL nel browser.\n');
  }

  if (linkOnly) {
    console.log('(--link: uscita anticipata)\n');
    return;
  }

  // ── Crea il profilo se mancante ──────────────────────────────────────────

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) {
    console.log('→ Creo profilo...');
    const { error: profileErr } = await supabase
      .from('profiles')
      .insert({ id: userId, username: TEST_USERNAME, email: TEST_EMAIL });

    if (profileErr) {
      console.error('Errore profilo:', profileErr.message);
    } else {
      console.log('✓ Profilo creato');
    }
  } else {
    console.log('✓ Profilo già esistente');
  }

  // ── Inserisce i viaggi ───────────────────────────────────────────────────

  if (resetMode) {
    console.log('\n→ Reset: elimino viaggi esistenti del test user...');
    const ids = TRIPS.map(t => t.id);
    const { error: delErr } = await supabase
      .from('trips')
      .delete()
      .eq('user_id', userId)
      .in('id', ids);
    if (delErr) console.warn('Attenzione durante delete:', delErr.message);
    else console.log('✓ Viaggi eliminati');
  }

  console.log('\n→ Inserisco viaggi...');
  for (const trip of TRIPS) {
    const { data: exists } = await supabase
      .from('trips')
      .select('id')
      .eq('id', trip.id)
      .maybeSingle();

    if (exists && !resetMode) {
      console.log(`  • ${trip.id}: già presente, skip (usa --reset per sovrascrivere)`);
      continue;
    }

    const { error: tripErr } = await supabase
      .from('trips')
      .upsert({ id: trip.id, user_id: userId, data: trip.data, status: 'active' });

    if (tripErr) {
      console.error(`  ✗ ${trip.id}: ${tripErr.message}`);
    } else {
      console.log(`  ✓ ${trip.id}`);
    }
  }

  // ── Riepilogo ─────────────────────────────────────────────────────────────

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Test user pronto\n');
  console.log(`  Email:    ${TEST_EMAIL}`);
  console.log(`  Username: ${TEST_USERNAME}`);
  console.log(`  User ID:  ${userId}`);
  console.log('\n  Viaggi:');
  console.log('   1. 2027-06-barcelona  Barcellona        voli + hotel + attività');
  console.log('   2. 2027-08-firenze    Toscana/Firenze   hotel + treni + noleggio + attività');
  console.log('   3. 2027-11-milano     Milano            ferry + bus + voli + hotel + attività');
  console.log('\n  Per un nuovo magic link:');
  console.log('  node scripts/seed-test-user.js --link\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(err => {
  console.error('Errore:', err);
  process.exit(1);
});
