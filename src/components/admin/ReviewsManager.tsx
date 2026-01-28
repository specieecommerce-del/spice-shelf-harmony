import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Star,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  Loader2,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  is_featured: boolean;
  helpful_count: number;
  created_at: string;
  product?: {
    name: string;
    image_url: string | null;
  };
}

const ReviewsManager = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_reviews")
        .select(`
          *,
          product:products(name, image_url)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Erro ao carregar avaliações");
    } finally {
      setIsLoading(false);
    }
  };

  const updateReview = async (reviewId: string, updates: Partial<Review>) => {
    try {
      const { error } = await supabase
        .from("product_reviews")
        .update(updates)
        .eq("id", reviewId);

      if (error) throw error;
      
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, ...updates } : r))
      );
      toast.success("Avaliação atualizada!");
    } catch (error) {
      console.error("Error updating review:", error);
      toast.error("Erro ao atualizar avaliação");
    }
  };

  const deleteReview = async () => {
    if (!selectedReview) return;

    try {
      const { error } = await supabase
        .from("product_reviews")
        .delete()
        .eq("id", selectedReview.id);

      if (error) throw error;

      setReviews((prev) => prev.filter((r) => r.id !== selectedReview.id));
      setIsDeleteOpen(false);
      setSelectedReview(null);
      toast.success("Avaliação excluída!");
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Erro ao excluir avaliação");
    }
  };

  const filteredReviews = reviews.filter((review) => {
    switch (filter) {
      case "pending":
        return !review.is_approved;
      case "approved":
        return review.is_approved;
      case "rejected":
        return !review.is_approved;
      default:
        return true;
    }
  });

  const stats = {
    total: reviews.length,
    approved: reviews.filter((r) => r.is_approved).length,
    pending: reviews.filter((r) => !r.is_approved).length,
    avgRating:
      reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : "0",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Avaliações de Produtos</h2>
        <p className="text-muted-foreground">
          Gerencie as avaliações deixadas pelos clientes
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{stats.approved}</div>
                <div className="text-sm text-muted-foreground">Aprovadas</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{stats.pending}</div>
                <div className="text-sm text-muted-foreground">Pendentes</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-spice-gold" />
              <div>
                <div className="text-2xl font-bold">{stats.avgRating}</div>
                <div className="text-sm text-muted-foreground">Média</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="approved">Aprovadas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reviews Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Comentário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma avaliação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {review.product?.image_url ? (
                          <img
                            src={review.product.image_url}
                            alt=""
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted" />
                        )}
                        <span className="font-medium truncate max-w-[150px]">
                          {review.product?.name || "Produto removido"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            className={
                              star <= review.rating
                                ? "fill-spice-gold text-spice-gold"
                                : "text-muted-foreground"
                            }
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        {review.title && (
                          <div className="font-medium truncate">{review.title}</div>
                        )}
                        <div className="text-sm text-muted-foreground truncate">
                          {review.comment || "Sem comentário"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={review.is_approved ? "default" : "secondary"}>
                          {review.is_approved ? "Aprovada" : "Pendente"}
                        </Badge>
                        {review.is_verified_purchase && (
                          <Badge variant="outline" className="text-xs">
                            Compra Verificada
                          </Badge>
                        )}
                        {review.is_featured && (
                          <Badge className="text-xs bg-spice-gold">
                            Destaque
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(review.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedReview(review);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={review.is_approved}
                          onCheckedChange={(checked) =>
                            updateReview(review.id, { is_approved: checked })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedReview(review);
                            setIsDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Avaliação</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {selectedReview.product?.image_url && (
                  <img
                    src={selectedReview.product.image_url}
                    alt=""
                    className="w-16 h-16 rounded object-cover"
                  />
                )}
                <div>
                  <div className="font-medium">{selectedReview.product?.name}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        className={
                          star <= selectedReview.rating
                            ? "fill-spice-gold text-spice-gold"
                            : "text-muted-foreground"
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>

              {selectedReview.title && (
                <div>
                  <label className="text-sm font-medium">Título</label>
                  <p>{selectedReview.title}</p>
                </div>
              )}

              {selectedReview.comment && (
                <div>
                  <label className="text-sm font-medium">Comentário</label>
                  <p className="text-muted-foreground">{selectedReview.comment}</p>
                </div>
              )}

              <div className="flex items-center gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <label className="text-sm">Aprovada</label>
                  <Switch
                    checked={selectedReview.is_approved}
                    onCheckedChange={(checked) => {
                      updateReview(selectedReview.id, { is_approved: checked });
                      setSelectedReview({ ...selectedReview, is_approved: checked });
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm">Destaque</label>
                  <Switch
                    checked={selectedReview.is_featured}
                    onCheckedChange={(checked) => {
                      updateReview(selectedReview.id, { is_featured: checked });
                      setSelectedReview({ ...selectedReview, is_featured: checked });
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Avaliação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteReview}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewsManager;