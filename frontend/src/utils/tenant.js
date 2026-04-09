export const getTenantFromSubdomain = () => {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // If we have a proxy structure or basic localhost multi-tenant
  // e.g. springfield.localhost -> parts = ['springfield', 'localhost']
  // e.g. springfield.sajiloschool.com -> parts = ['springfield', 'sajiloschool', 'com']
  if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== 'www') {
    return parts[0];
  }
  return null;
};
