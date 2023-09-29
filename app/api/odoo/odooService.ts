const Odoo = require('odoo-xmlrpc');
import { config } from '@/config/params';


function odooRequest(
    pModel: any,
    action: any,
    params: any,
    company_id: any,
    callback: any
) {
	const company_data = config.companies.find((company) => {return company.id == company_id})
	const odoo_connection = (company_data ? company_data.odoo_connection : false)
	
    if(!odoo_connection) return callback({status: false, message: 'No se encontro la compañia con ID:'+company_id})
	const odoo = new Odoo(odoo_connection);

    odoo.connect(function (pError: any) {
        if (pError) { 
            console.log(pError); 
            callback({status:false}); 
        } else {
            odoo.execute_kw(pModel, action, params, function (pError: any, result: any) {
                if (pError) {
                    console.log(pError)
                    callback({status: false, message: pError})
                } else {
                    callback({status: true, data: result})
                }
            });
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
	callback: any
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
	})
}

export async function setOdooData(pModel: any, pIDs: any, pData: any, company_id: any, callback: any) {
	const action = 'write'
	var inParams, params;
	inParams = [];
	inParams.push(pIDs);
	inParams.push(pData);
	params = [];
	params.push(inParams);

	await odooRequest(pModel, action, params, company_id, (res: any) => {
		callback(res)
	})
}

export async function createOdooData(pModel: any, pData: any, company_id: any, callback: any) {
	const action = 'create'
	var inParams, params;
	inParams = [];
	inParams.push(pData);
	params = [];
	params.push(inParams);

    await odooRequest(pModel, action, params, company_id, (res: any) => {
		callback(res)
	})
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
	})
}
