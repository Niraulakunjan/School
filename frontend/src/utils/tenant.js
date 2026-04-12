export const getTenantFromSubdomain = () => {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // If we have a proxy structure or basic localhost multi-tenant
  // e.g. springfield.localhost -> parts = ['springfield', 'localhost']
  // e.g. springfield.sajiloschool.com -> parts = ['springfield', 'sajiloschool', 'com']
  const excluded = ['localhost', 'www', 'apiscl', 'school', 'admin', 'pc', 'sc', '127'];
  if (parts.length >= 2 && !excluded.includes(parts[0])) {
    return parts[0];
  }

  return null;
};
