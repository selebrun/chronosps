import { NextResponse } from 'next/server';
import { getOdooData } from '@/app/api/odoo/odooService';
import { runQuery } from '../db';

export async function POST(req: Request) {
  const body = await req.json();

  const assets = await new Promise<any[]>((resolve) => {
    getOdooData(
      'asset.asset',
      [],
      ['id', 'name', 'code', 'category_id', 'active'],
      500,
      'name ASC',
      body.companyId,
      (res: any) => resolve(res?.data || []),
      false,
    );
  });

  for (const asset of assets) {
    const assetType = Array.isArray(asset.category_id) ? asset.category_id[1] : 'Rodante';
    await runQuery(
      `INSERT INTO guest_assets_catalog (company_id, fracttal_asset_id, code, name, asset_type, active)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (company_id, fracttal_asset_id)
       DO UPDATE SET code=$3, name=$4, asset_type=$5, active=$6`,
      [body.companyId, String(asset.id), asset.code || '', asset.name || '', assetType, !!asset.active]
    );
  }

  return NextResponse.json({ synced: assets.length });
}
