import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Parse request body
    const { filePath, bucket = 'meeting-attachments', expiresIn = 3600 } = await req.json();

    if (!filePath) {
      console.error('No file path provided');
      return new Response(
        JSON.stringify({ error: 'File path is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Requesting signed URL for:', filePath, 'in bucket:', bucket);

    // For meeting-attachments, verify user has access to the attachment
    if (bucket === 'meeting-attachments') {
      // Extract minute_id from file path (format: {user_id}/{minute_id}/{timestamp}.{ext})
      const pathParts = filePath.split('/');
      if (pathParts.length >= 2) {
        const minuteId = pathParts[1];
        
        // Verify user has access to this minute's event
        const { data: attachment, error: attachmentError } = await supabase
          .from('meeting_minute_attachments')
          .select(`
            id,
            minute_id,
            meeting_minutes!inner (
              event_id,
              events!inner (
                creator_id
              )
            )
          `)
          .eq('file_path', filePath)
          .single();

        if (attachmentError || !attachment) {
          console.error('Attachment not found or access denied:', attachmentError);
          return new Response(
            JSON.stringify({ error: 'Attachment not found or access denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if user is event creator or participant
        const eventId = (attachment.meeting_minutes as any)?.event_id;
        const creatorId = (attachment.meeting_minutes as any)?.events?.creator_id;
        
        if (creatorId !== user.id) {
          // Check if user is a participant
          const { data: participation } = await supabase
            .from('event_responses')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .single();

          if (!participation) {
            console.error('User is not a participant of the event');
            return new Response(
              JSON.stringify({ error: 'Access denied' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        console.log('User verified access to attachment');
      }
    }

    // Create service role client to generate signed URL
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Generate signed URL
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create signed URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully created signed URL for:', filePath);

    return new Response(
      JSON.stringify({ signedUrl: data.signedUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});