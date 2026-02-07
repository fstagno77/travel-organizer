/**
 * Netlify Function: Delete Passenger
 * Removes a passenger from all flights with the same booking reference
 * Also deletes the passenger's associated PDF from storage
 */

const { authenticateRequest, unauthorizedResponse, getCorsHeaders, handleOptions } = require('./utils/auth');
const { deletePdf } = require('./utils/storage');

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  // Authenticate request
  const authResult = await authenticateRequest(event);
  if (!authResult) {
    return unauthorizedResponse();
  }

  const { supabase } = authResult;

  try {
    const { tripId, passengerName, bookingReference } = JSON.parse(event.body);

    if (!tripId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip ID is required' })
      };
    }

    if (!passengerName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Passenger name is required' })
      };
    }

    if (!bookingReference) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Booking reference is required' })
      };
    }

    // Get existing trip (RLS ensures user can only access own trips)
    const { data: tripRecord, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (fetchError || !tripRecord) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Trip not found' })
      };
    }

    const tripData = tripRecord.data;
    const normalizedBookingRef = bookingReference.toLowerCase().trim();
    const normalizedPassengerName = passengerName.toLowerCase().trim();

    let removedCount = 0;
    const pdfsToDelete = [];

    // Find all flights with this booking reference and remove the passenger
    if (tripData.flights) {
      for (const flight of tripData.flights) {
        const flightBookingRef = flight.bookingReference?.toLowerCase()?.trim();

        if (flightBookingRef === normalizedBookingRef && flight.passengers) {
          const passengerIndex = flight.passengers.findIndex(p =>
            p.name?.toLowerCase()?.trim() === normalizedPassengerName
          );

          if (passengerIndex !== -1) {
            const passenger = flight.passengers[passengerIndex];

            // Collect PDF to delete
            if (passenger.pdfPath) {
              pdfsToDelete.push(passenger.pdfPath);
            }

            // Remove passenger from array
            flight.passengers.splice(passengerIndex, 1);
            removedCount++;

            console.log(`Removed passenger ${passengerName} from flight ${flight.flightNumber} on ${flight.date}`);
          }
        }
      }
    }

    if (removedCount === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Passenger not found in any flight with this booking reference'
        })
      };
    }

    // Delete associated PDFs (unique paths only)
    const uniquePdfs = [...new Set(pdfsToDelete)];
    for (const pdfPath of uniquePdfs) {
      try {
        console.log(`Deleting PDF: ${pdfPath}`);
        await deletePdf(pdfPath);
      } catch (err) {
        console.error(`Error deleting PDF ${pdfPath}:`, err);
        // Continue even if PDF deletion fails
      }
    }

    // Save updated trip
    const { error: updateError } = await supabase
      .from('trips')
      .update({
        data: tripData,
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId);

    if (updateError) {
      console.error('Supabase error:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to update trip' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        removedFromFlights: removedCount,
        tripData
      })
    };

  } catch (error) {
    console.error('Error deleting passenger:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to delete passenger'
      })
    };
  }
};
