<?php

declare(strict_types=1);

namespace Dyg81\ModalBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * @author Donald Yañez González <donald.yanez@gmail.com>
 * @author Rares Serban <raresserban96@gmail.com>
 */
class ModalController extends AbstractController
{
    /**
     * Displays a simple message in a modal.
     */
    #[Route('/open/{message}', name: 'dyg81_modal_open_message', methods: ['GET'])]
    public function openMessageModalAction(string $message): Response
    {
        return $this->render('@Dyg81Modal/messageModal.html.twig', [
            'message' => $message,
        ]);
    }

    /**
     * Displays a simple confirmation modal.
     */
    #[Route('/confirm', name: 'dyg81_modal_open_confirm', methods: ['GET'])]
    public function openConfirmModalAction(): Response
    {
        return $this->render('@Dyg81Modal/baseConfirmModal.html.twig');
    }
}
