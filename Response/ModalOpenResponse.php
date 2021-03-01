<?php

namespace Dyg81\ModalBundle\Response;

use Symfony\Component\HttpFoundation\JsonResponse;

class ModalOpenResponse extends JsonResponse
{
    /**
     * Open a new modal after a successful form submission.
     *
     * @param string $modal
     *   The modal that will be opened.
     * @param string $modalId
     *   The id of the modal.
     *
     * @author Donald Yañez González <donald.yanez@gmail.com>
     */
    public function __construct($modal, $modalId = null)
    {
        parent::__construct([
            'modal' => $modal,
            'modalId' => $modalId
        ]);
    }

}
