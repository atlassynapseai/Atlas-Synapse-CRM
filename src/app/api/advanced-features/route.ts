import {
  createCustomField,
  createContract,
  createTerritory,
  uploadDocument,
} from '@/lib/advanced-features';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    switch (action) {
      case 'create_field': {
        const field = await createCustomField(data);
        await supabase.from('custom_fields').insert(data);
        return new Response(
          JSON.stringify({ success: true, field: data }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }

      case 'create_contract': {
        const contract = await createContract(data);
        const { data: contractData, error } = await supabase
          .from('contracts')
          .insert({ ...contract, created_at: new Date().toISOString() });
        if (error) throw error;
        return new Response(
          JSON.stringify({ contract: contractData?.[0] }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }

      case 'create_territory': {
        const territory = await createTerritory(data);
        await supabase.from('territories').insert(territory);
        return new Response(
          JSON.stringify({ territory }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }

      case 'upload_document': {
        const doc = await uploadDocument(data.leadId, data.file);
        await supabase.from('documents').insert(doc);
        return new Response(
          JSON.stringify({ document: doc }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Advanced features error:', error);
    return new Response(
      JSON.stringify({ error: 'Operation failed' }),
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const resource = url.searchParams.get('resource');

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    let data;
    switch (resource) {
      case 'fields':
        ({ data } = await supabase.from('custom_fields').select('*'));
        break;
      case 'contracts':
        ({ data } = await supabase.from('contracts').select('*'));
        break;
      case 'territories':
        ({ data } = await supabase.from('territories').select('*'));
        break;
      case 'documents':
        ({ data } = await supabase.from('documents').select('*'));
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid resource' }),
          { status: 400 }
        );
    }

    return new Response(JSON.stringify({ [resource]: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fetch error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch' }),
      { status: 500 }
    );
  }
}
