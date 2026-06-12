const Odoo = require('odoo-xmlrpc');
const xmlrpc = require('xmlrpc');
const url = require('url');
import { config } from '@/config/params';
import { getCompanies } from "@/app/api/companies/companies";

function executeKwWithUid(
  odooConnection: any,
  uid: number,
  model: string,
  action: string,
  params: any[],
  callback: any
) {
  const urlParts = url.parse(odooConnection.url);
  const clientOptions = {
    host: urlParts.hostname,
    port: odooConnection.port || urlParts.port,
    path: '/xmlrpc/2/object',
  };
  const client = urlParts.protocol === 'https:'
    ? xmlrpc.createSecureClient(clientOptions)
    : xmlrpc.createClient(clientOptions);
  const fparams = [
    odooConnection.db,
    uid,
    odooConnection.password,
    model,
    action,
    ...params,
  ];

  client.methodCall('execute_kw', fparams, callback);
}


async function odooRequest(
    pModel: any,
    action: any,
    params: any,
    company_id: any,
    callback: any,
		userAdmin: boolean,
    uidOverride: number | false = false
) {
  const companyId = typeof company_id === 'string' ? company_id.trim() : '';
  if (!companyId) {
    callback({ status: false, message: 'No se encontro la compania del usuario en la sesion.' });
    return;
  }


	const companies =  await getCompanies()
	const mapCompanies = companies.map(company => {
		return(
			{
				"id": company.id_company?.trim(),
				"company": company.name?.trim(),
				"odoo_connection": {
						"domain": company.domain?.trim(),
						"url":  company.url?.trim(),
						"port": 443,
						"db": company.database?.trim(),
						"username":  company.user_default?.trim(),
						"password": company.password?.trim()
			}
	})})

	const company_data =  mapCompanies.find(company => company.id == companyId);


	//const company_data = mapCompanies.find((company) => {return company.odoo_connection.username === 'admin'})
	const odoo_connection = (company_data ? company_data.odoo_connection : false)
  if(!odoo_connection) return callback({status: false, message: 'No se encontro la compañia con ID:'+company_id})
  const onDone = (pError: any, result: any) => {
    if (pError) {
      const faultString = pError?.faultString || pError?.message || '';
      if (typeof faultString === 'string' && faultString.includes('cannot marshal None')) {
        callback({status: true, data: true})
        return
      }
      console.log(pError)
      callback({status: false, message: pError})
    } else {
      callback({status: true, data: result})
    }
  };

  if (uidOverride) {
    executeKwWithUid(odoo_connection, uidOverride, pModel, action, params, onDone);
    return;
  }
	const odoo = new Odoo(odoo_connection);

    odoo.connect(function (pError: any) {
        if (pError) { 
            console.log(pError, "pErrorpError"); 
            callback({status:false}); 
        } else {
            odoo.execute_kw(pModel, action, params, onDone);
        }
    });
}


export async function getOdooData(
	pModel: any,
	pFilter: any,
	pFields: any,
	limit: any,
	order: any,
	company_id: any,
	callback: any,
	userAdmin: boolean
) {
	let inParams, params;
	const action = 'search_read'
	if(isNaN(limit)) limit = 0
	inParams = [];
	inParams.push(pFilter);
	inParams.push(pFields);
	inParams.push(0);
	inParams.push(limit);
	if(order) inParams.push(order);

	params = [];
	params.push(inParams);

	await odooRequest(pModel, action,params, company_id, (res: any) => {
		callback(res)
	}, userAdmin)
}

export async function setOdooData(pModel: any, pIDs: any, pData: any, company_id: any, callback: any, uidOverride: number | false = false) {
	const action = 'write'
	var inParams, params;
	inParams = [];
	inParams.push(pIDs);
	inParams.push(pData);
	params = [];
	params.push(inParams);

	await odooRequest(pModel, action, params, company_id, (res: any) => {
		callback(res)
	},  false, uidOverride)
}

export async function createOdooData(pModel: any, pData: any, company_id: any, callback: any, 	userAdmin: boolean, uidOverride: number | false = false) {
	const action = 'create'
	var inParams, params;
	inParams = [];
	inParams.push(pData);
	params = [];
	params.push(inParams);

    await odooRequest(pModel, action, params, company_id, (res: any) => {
		callback(res)
	},userAdmin, uidOverride)
}

export async function executeOdooMethod(pModel: any, method: any, args: any[], company_id: any, callback: any, kwargs: any = false, uidOverride: number | false = false) {
	const params = [];
	params.push(args);
	if (kwargs) params.push(kwargs);

	await odooRequest(pModel, method, params, company_id, (res: any) => {
		const faultString = res?.message?.faultString || res?.message?.message || res?.message || '';
		if (!res?.status && typeof faultString === 'string' && faultString.includes('cannot marshal None')) {
			callback({ status: true, data: true });
			return;
		}
		callback(res)
	}, false, uidOverride)
}

export async function countOdooData(pModel: any, pFilter: any, pFields: any, company_id: any, callback: any) {
	var inParams, params;
	const action = 'search_count'
	inParams = [];
	inParams.push(pFilter);
	inParams.push(pFields);
	inParams.push(0);
	params = [];
	params.push(inParams);
	
	await odooRequest(pModel, action, params, company_id, (res: any) => {
		callback(res)
	}, false)
}
