-- Migration 019: Cleanup base64 pdfPath in trip booking items
--
-- Problema: il flusso di edit salvava erroneamente il PDF come base64 data URL
-- (es. "data:application/pdf;base64,...") nel campo pdfPath invece di un
-- path su storage. Questa migration nullifica quei valori corrotti su tutti
-- i tipi di item (flights, hotels, trains, ferries, buses, rentals).
--
-- Struttura dati: public.trips.data (JSONB)
--   data.flights[]        → item.pdfPath
--   data.flights[].passengers[] → passenger.pdfPath
--   data.hotels[]         → item.pdfPath
--   data.trains[]         → item.pdfPath
--   data.ferries[]        → item.pdfPath
--   data.buses[]          → item.pdfPath
--   data.rentals[]        → item.pdfPath
--
-- Idempotente: può girare più volte senza effetti collaterali.
-- I record senza pdfPath corrotti non vengono toccati.

-- ============================================================
-- FLIGHTS: nullifica pdfPath dell'item se inizia con "data:"
-- ============================================================
UPDATE public.trips
SET data = jsonb_set(
  data,
  '{flights}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN (flight->>'pdfPath') LIKE 'data:%'
        THEN flight - 'pdfPath' || '{"pdfPath": null}'::jsonb
        ELSE flight
      END
    )
    FROM jsonb_array_elements(data->'flights') AS flight
  )
)
WHERE data->'flights' IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(data->'flights') AS flight
    WHERE (flight->>'pdfPath') LIKE 'data:%'
  );

-- ============================================================
-- FLIGHTS > PASSENGERS: nullifica pdfPath nei passeggeri
-- ============================================================
UPDATE public.trips
SET data = jsonb_set(
  data,
  '{flights}',
  (
    SELECT jsonb_agg(
      jsonb_set(
        flight,
        '{passengers}',
        COALESCE(
          (
            SELECT jsonb_agg(
              CASE
                WHEN (passenger->>'pdfPath') LIKE 'data:%'
                THEN passenger - 'pdfPath' || '{"pdfPath": null}'::jsonb
                ELSE passenger
              END
            )
            FROM jsonb_array_elements(flight->'passengers') AS passenger
          ),
          flight->'passengers'
        )
      )
    )
    FROM jsonb_array_elements(data->'flights') AS flight
  )
)
WHERE data->'flights' IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(data->'flights') AS flight,
         jsonb_array_elements(flight->'passengers') AS passenger
    WHERE (passenger->>'pdfPath') LIKE 'data:%'
  );

-- ============================================================
-- HOTELS: nullifica pdfPath
-- ============================================================
UPDATE public.trips
SET data = jsonb_set(
  data,
  '{hotels}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN (hotel->>'pdfPath') LIKE 'data:%'
        THEN hotel - 'pdfPath' || '{"pdfPath": null}'::jsonb
        ELSE hotel
      END
    )
    FROM jsonb_array_elements(data->'hotels') AS hotel
  )
)
WHERE data->'hotels' IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(data->'hotels') AS hotel
    WHERE (hotel->>'pdfPath') LIKE 'data:%'
  );

-- ============================================================
-- TRAINS: nullifica pdfPath
-- ============================================================
UPDATE public.trips
SET data = jsonb_set(
  data,
  '{trains}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN (train->>'pdfPath') LIKE 'data:%'
        THEN train - 'pdfPath' || '{"pdfPath": null}'::jsonb
        ELSE train
      END
    )
    FROM jsonb_array_elements(data->'trains') AS train
  )
)
WHERE data->'trains' IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(data->'trains') AS train
    WHERE (train->>'pdfPath') LIKE 'data:%'
  );

-- ============================================================
-- FERRIES: nullifica pdfPath
-- ============================================================
UPDATE public.trips
SET data = jsonb_set(
  data,
  '{ferries}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN (ferry->>'pdfPath') LIKE 'data:%'
        THEN ferry - 'pdfPath' || '{"pdfPath": null}'::jsonb
        ELSE ferry
      END
    )
    FROM jsonb_array_elements(data->'ferries') AS ferry
  )
)
WHERE data->'ferries' IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(data->'ferries') AS ferry
    WHERE (ferry->>'pdfPath') LIKE 'data:%'
  );

-- ============================================================
-- BUSES: nullifica pdfPath
-- ============================================================
UPDATE public.trips
SET data = jsonb_set(
  data,
  '{buses}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN (bus->>'pdfPath') LIKE 'data:%'
        THEN bus - 'pdfPath' || '{"pdfPath": null}'::jsonb
        ELSE bus
      END
    )
    FROM jsonb_array_elements(data->'buses') AS bus
  )
)
WHERE data->'buses' IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(data->'buses') AS bus
    WHERE (bus->>'pdfPath') LIKE 'data:%'
  );

-- ============================================================
-- RENTALS: nullifica pdfPath
-- ============================================================
UPDATE public.trips
SET data = jsonb_set(
  data,
  '{rentals}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN (rental->>'pdfPath') LIKE 'data:%'
        THEN rental - 'pdfPath' || '{"pdfPath": null}'::jsonb
        ELSE rental
      END
    )
    FROM jsonb_array_elements(data->'rentals') AS rental
  )
)
WHERE data->'rentals' IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(data->'rentals') AS rental
    WHERE (rental->>'pdfPath') LIKE 'data:%'
  );
