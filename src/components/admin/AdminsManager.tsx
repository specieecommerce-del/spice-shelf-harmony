import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Shield, Trash2, Settings, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface AdminPermissions {
  can_view_dashboard: boolean;
  can_manage_orders: boolean;
  can_manage_shipping: boolean;
  can_manage_products: boolean;
  can_manage_whatsapp: boolean;
  can_manage_admins: boolean;
}

interface AdminUser {
  user_id: string;
  email: string;
  created_at: string;
  permissions: AdminPermissions;
}

const defaultPermissions: AdminPermissions = {
  can_view_dashboard: true,
  can_manage_orders: false,
  can_manage_shipping: false,
  can_manage_products: false,
  can_manage_whatsapp: false,
  can_manage_admins: false,
};

const permissionLabels: Record<keyof AdminPermissions, string> = {
  can_view_dashboard: "Ver Dashboard",
  can_manage_orders: "Gerenciar Pedidos",
  can_manage_shipping: "Gerenciar Envios",
  can_manage_products: "Gerenciar Produtos",
  can_manage_whatsapp: "Alertas WhatsApp",
  can_manage_admins: "Gerenciar Admins",
};

export function AdminsManager() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newPermissions, setNewPermissions] = useState<AdminPermissions>(defaultPermissions);
  const [myPermissions, setMyPermissions] = useState<AdminPermissions | null>(null);

  useEffect(() => {
    loadAdmins();
    loadMyPermissions();
  }, []);

  const loadMyPermissions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("manage-admins", {
        body: { action: "get_my_permissions" },
      });

      if (error) throw error;
      setMyPermissions(data.permissions);
    } catch (error) {
      console.error("Error loading permissions:", error);
    }
  };

  const loadAdmins = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("manage-admins", {
        body: { action: "list_admins" },
      });

      if (error) throw error;
      setAdmins(data.admins || []);
    } catch (error: any) {
      console.error("Error loading admins:", error);
      toast.error("Erro ao carregar administradores");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast.error("Digite o email do usuário");
      return;
    }

    try {
      setIsSaving(true);
      const { data, error } = await supabase.functions.invoke("manage-admins", {
        body: {
          action: "add_admin",
          email: newAdminEmail.trim(),
          permissions: newPermissions,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Administrador adicionado com sucesso!");
      setShowAddDialog(false);
      setNewAdminEmail("");
      setNewPermissions(defaultPermissions);
      loadAdmins();
    } catch (error: any) {
      console.error("Error adding admin:", error);
      toast.error(error.message || "Erro ao adicionar administrador");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!editingAdmin) return;

    try {
      setIsSaving(true);
      const { data, error } = await supabase.functions.invoke("manage-admins", {
        body: {
          action: "update_permissions",
          targetUserId: editingAdmin.user_id,
          permissions: editingAdmin.permissions,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Permissões atualizadas!");
      setEditingAdmin(null);
      loadAdmins();
    } catch (error: any) {
      console.error("Error updating permissions:", error);
      toast.error(error.message || "Erro ao atualizar permissões");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAdmin = async (admin: AdminUser) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-admins", {
        body: {
          action: "remove_admin",
          targetUserId: admin.user_id,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Administrador removido!");
      loadAdmins();
    } catch (error: any) {
      console.error("Error removing admin:", error);
      toast.error(error.message || "Erro ao remover administrador");
    }
  };

  const countActivePermissions = (perms: AdminPermissions) => {
    return Object.values(perms).filter(Boolean).length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canManageAdmins = myPermissions?.can_manage_admins ?? true;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gerenciar Administradores</h2>
          <p className="text-muted-foreground">
            Adicione administradores e defina suas permissões de acesso
          </p>
        </div>
        
        {canManageAdmins && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus size={18} />
                Adicionar Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Administrador</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email do usuário</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@email.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    O usuário precisa ter uma conta cadastrada na loja
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Label>Permissões</Label>
                  {(Object.keys(permissionLabels) as (keyof AdminPermissions)[]).map((key) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm">{permissionLabels[key]}</span>
                      <Switch
                        checked={newPermissions[key]}
                        onCheckedChange={(checked) =>
                          setNewPermissions((prev) => ({ ...prev, [key]: checked }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddAdmin} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Administradores Ativos
          </CardTitle>
          <CardDescription>
            {admins.length} administrador(es) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum administrador encontrado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead>Adicionado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.user_id}>
                    <TableCell className="font-medium">
                      {admin.email}
                      {admin.user_id === user?.id && (
                        <Badge variant="secondary" className="ml-2">Você</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {countActivePermissions(admin.permissions)} de 6
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(admin.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Dialog
                          open={editingAdmin?.user_id === admin.user_id}
                          onOpenChange={(open) => {
                            if (!open) setEditingAdmin(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingAdmin({ ...admin })}
                              disabled={!canManageAdmins}
                            >
                              <Settings size={16} />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Editar Permissões</DialogTitle>
                            </DialogHeader>
                            {editingAdmin && (
                              <div className="space-y-4 py-4">
                                <p className="text-sm text-muted-foreground">
                                  Editando permissões de <strong>{editingAdmin.email}</strong>
                                </p>
                                <div className="space-y-3">
                                  {(Object.keys(permissionLabels) as (keyof AdminPermissions)[]).map(
                                    (key) => (
                                      <div key={key} className="flex items-center justify-between">
                                        <span className="text-sm">{permissionLabels[key]}</span>
                                        <Switch
                                          checked={editingAdmin.permissions[key]}
                                          onCheckedChange={(checked) =>
                                            setEditingAdmin((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    permissions: { ...prev.permissions, [key]: checked },
                                                  }
                                                : null
                                            )
                                          }
                                        />
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingAdmin(null)}>
                                Cancelar
                              </Button>
                              <Button onClick={handleUpdatePermissions} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {admin.user_id !== user?.id && canManageAdmins && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-destructive">
                                <Trash2 size={16} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover administrador?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover <strong>{admin.email}</strong> como
                                  administrador? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveAdmin(admin)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guia de Permissões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">Dashboard</Badge>
              <span className="text-muted-foreground">Visualizar métricas de vendas e estoque</span>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">Pedidos</Badge>
              <span className="text-muted-foreground">Ver e gerenciar pedidos, confirmar pagamentos PIX</span>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">Envios</Badge>
              <span className="text-muted-foreground">Adicionar códigos de rastreio e gerenciar logística</span>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">Produtos</Badge>
              <span className="text-muted-foreground">Criar, editar e gerenciar estoque de produtos</span>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">WhatsApp</Badge>
              <span className="text-muted-foreground">Configurar alertas de pedidos e estoque baixo</span>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">Admins</Badge>
              <span className="text-muted-foreground">Adicionar/remover administradores e suas permissões</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
