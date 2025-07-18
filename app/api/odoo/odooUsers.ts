import { getOdooData } from '@/app/api/odoo/odooService';

// `server-only` guarantees any modules that import code in file
// will never run on the client. Even though this particular api
// doesn't currently use sensitive environment variables, it's
// good practise to add `server-only` preemptively.
import 'server-only';

export async function getUsersFromOdoo(company_id: string) {
  return new Promise(async (resolve, reject) => {
    getOdooData(
      'res.partner',
      [['x_studio_produccion_app','=',true],['vat','!=',false]],
      ['id','name','vat','mobile','email','x_studio_password','x_studio_rol_en_produccin','x_studio_new_material'],
      false,
      false,
      company_id,
      (data: any) => {
      
        if(!data || !data.data) {
          reject({ status: false, message: 'No se encontraron usuarios para esta compañia.', data: false });
          return;
        }

        const users = data.data;
        resolve(users);
      },
      false
    )
    
    ;
  });
}