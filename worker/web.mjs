// Sólo archivos de la aplicación. Sin base de datos, secretos ni URL pública.
export default {fetch(request,env){
  if(!['GET','HEAD'].includes(request.method))return new Response('Método no permitido.',{status:405});
  if(new URL(request.url).pathname.startsWith('/api/'))return new Response('Ruta no encontrada.',{status:404});
  return env.FILES.fetch(request);
}};
