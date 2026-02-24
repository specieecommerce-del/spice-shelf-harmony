import { Wallet, Receipt, CreditCard, Building2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PaymentsHubProps {
  onSelectGateway: (gateway: string) => void;
}

const gateways = [
  {
    key: "pix-manual",
    name: "PIX Manual",
    description: "PIX com QR Code gerado pelo sistema",
    icon: Wallet,
    enabled: true,
  },
  {
    key: "boleto",
    name: "Boleto / Depósito",
    description: "Boleto bancário ou depósito manual",
    icon: Receipt,
    enabled: true,
  },
  {
    key: "infinitepay",
    name: "InfinitePay",
    description: "Cartão de crédito/débito via InfinitePay",
    icon: CreditCard,
    enabled: true,
  },
  {
    key: "pagseguro",
    name: "PagSeguro",
    description: "Cartão de crédito/débito via PagSeguro",
    icon: CreditCard,
    enabled: true,
  },
  {
    key: "nubank",
    name: "Nubank PJ",
    description: "Em breve — aguardando API oficial",
    icon: Building2,
    enabled: false,
  },
];

const PaymentsHub = ({ onSelectGateway }: PaymentsHubProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configurações de Pagamento</h2>
        <p className="text-muted-foreground">
          Selecione o método de pagamento que deseja configurar
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {gateways.map((gw) => (
          <Card
            key={gw.key}
            className={gw.enabled ? "" : "opacity-60"}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${gw.enabled ? "bg-primary/10" : "bg-muted"}`}>
                  <gw.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{gw.name}</h3>
                    {!gw.enabled && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                        <Clock className="h-3 w-3 mr-1" />
                        Em Breve
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{gw.description}</p>
                </div>
                {gw.enabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectGateway(gw.key)}
                  >
                    Configurar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PaymentsHub;
