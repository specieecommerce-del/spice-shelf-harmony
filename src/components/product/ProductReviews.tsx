import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Star, ThumbsUp, CheckCircle, Loader2, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_purchase: boolean;
  is_featured: boolean;
  helpful_count: number;
  created_at: string;
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

const ProductReviews = ({ productId, productName }: ProductReviewsProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: "",
    comment: "",
  });

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const submitReview = async () => {
    if (!user) {
      toast.error("Faça login para avaliar o produto");
      return;
    }

    if (!newReview.comment.trim()) {
      toast.error("Escreva um comentário sobre o produto");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("product_reviews").insert({
        product_id: productId,
        user_id: user.id,
        rating: newReview.rating,
        title: newReview.title.trim() || null,
        comment: newReview.comment.trim(),
      });

      if (error) throw error;

      toast.success("Avaliação enviada com sucesso!");
      setNewReview({ rating: 5, title: "", comment: "" });
      setShowForm(false);
      fetchReviews();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast.error("Erro ao enviar avaliação");
    } finally {
      setIsSubmitting(false);
    }
  };

  const markHelpful = async (reviewId: string) => {
    try {
      const review = reviews.find((r) => r.id === reviewId);
      if (!review) return;

      await supabase
        .from("product_reviews")
        .update({ helpful_count: review.helpful_count + 1 })
        .eq("id", reviewId);

      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r
        )
      );
    } catch (error) {
      console.error("Error marking helpful:", error);
    }
  };

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
    percentage:
      reviews.length > 0
        ? (reviews.filter((r) => r.rating === rating).length / reviews.length) *
          100
        : 0,
  }));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Average Rating */}
        <div className="text-center md:text-left">
          <div className="text-5xl font-bold text-foreground">
            {averageRating.toFixed(1)}
          </div>
          <div className="flex items-center justify-center md:justify-start gap-1 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={20}
                className={
                  star <= Math.round(averageRating)
                    ? "fill-spice-gold text-spice-gold"
                    : "text-muted-foreground"
                }
              />
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            {reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"}
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1 space-y-2">
          {ratingDistribution.map(({ rating, count, percentage }) => (
            <div key={rating} className="flex items-center gap-3">
              <span className="text-sm w-4">{rating}</span>
              <Star size={14} className="text-spice-gold fill-spice-gold" />
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-spice-gold transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground w-8">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Write Review Button */}
      {user && !showForm && (
        <Button onClick={() => setShowForm(true)} className="w-full md:w-auto">
          <Star className="h-4 w-4 mr-2" />
          Escrever Avaliação
        </Button>
      )}

      {!user && (
        <p className="text-muted-foreground text-center py-4">
          Faça login para avaliar este produto
        </p>
      )}

      {/* Review Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Avaliar {productName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Star Rating */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Sua Nota
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReview((prev) => ({ ...prev, rating: star }))}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      size={28}
                      className={
                        star <= newReview.rating
                          ? "fill-spice-gold text-spice-gold"
                          : "text-muted-foreground hover:text-spice-gold"
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Título (opcional)
              </label>
              <Input
                value={newReview.title}
                onChange={(e) =>
                  setNewReview((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Resumo da sua experiência"
              />
            </div>

            {/* Comment */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Comentário *
              </label>
              <Textarea
                value={newReview.comment}
                onChange={(e) =>
                  setNewReview((prev) => ({ ...prev, comment: e.target.value }))
                }
                placeholder="Conte sua experiência com este produto..."
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button onClick={submitReview} disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Enviar Avaliação
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>Este produto ainda não tem avaliações.</p>
            {user && (
              <p className="text-sm mt-2">Seja o primeiro a avaliar!</p>
            )}
          </div>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} className={review.is_featured ? "border-primary" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Cliente</span>
                        {review.is_verified_purchase && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Compra Verificada
                          </Badge>
                        )}
                        {review.is_featured && (
                          <Badge className="text-xs">Destaque</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-0.5">
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
                        <span className="text-xs text-muted-foreground">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {review.title && (
                  <h4 className="font-semibold mt-4">{review.title}</h4>
                )}
                
                {review.comment && (
                  <p className="text-muted-foreground mt-2">{review.comment}</p>
                )}

                <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                  <button
                    onClick={() => markHelpful(review.id)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Útil ({review.helpful_count})
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductReviews;