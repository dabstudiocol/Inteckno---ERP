import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace regardless of \r\n or \n
const targetSnippet = "const MainContent: React.FC = () => {\n  const { activeModuleId, isAuthenticated } = useErp();\n\n  if (!isAuthenticated) {\n    return <LoginView />;\n  }\n\n  const getModuleInfo = () => {";
const normalizedContent = content.replace(/\r\n/g, '\n');

const replacementSnippet = `import { Forbidden403View } from './components/common/Forbidden403View';
import { canUserAccessModule } from './core/auth/rbac';

const MainContent: React.FC = () => {
  const { activeModuleId, isAuthenticated, currentUser, setActiveModule } = useErp();

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Auditoría Práctica Parte 6: Blindaje de Roles y Guardián de Rutas (Route Guard)
  // Previene 'Security by Obscurity' si un usuario digita o fuerza la URL de costos, nómina o tableros
  const role = currentUser?.role || 'tecnico_stc';
  const isAuthorized = canUserAccessModule(role, activeModuleId);

  if (!isAuthorized) {
    return (
      <AppShell activeTitle="403 Acceso Denegado" activeSubtitle="Violación de Control de Acceso RBAC">
        <Forbidden403View
          moduleName={activeModuleId.toUpperCase()}
          userRole={currentUser?.roleLabel || role}
          onGoBack={() => setActiveModule('proyectos')}
        />
      </AppShell>
    );
  }

  const getModuleInfo = () => {`;

if (normalizedContent.includes(targetSnippet)) {
  const updated = normalizedContent.replace(targetSnippet, replacementSnippet);
  fs.writeFileSync('src/App.tsx', updated, 'utf8');
  console.log('✅ Route Guard 403 integrado con éxito en src/App.tsx');
} else {
  console.error('❌ Target snippet no encontrado');
}
